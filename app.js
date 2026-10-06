(() => {
  const API = 'https://pokeapi.co/api/v2';
  const POKEDEX_BASE = 'https://www.pokemon.com/us/pokedex/';
  const LIST_URL = `${API}/pokemon?limit=2000`;
  const $ = id => document.getElementById(id);
  const els = {
    search:$('search'), form:$('searchForm'), status:$('status'), pokedex:$('pokedex'), entry:$('entry'), loading:$('loadingCard'),
    number:$('number'), heroName:$('heroName'), genus:$('genus'), art:$('art'), types:$('types'), description:$('description'),
    height:$('height'), weight:$('weight'), category:$('category'), generation:$('generation'), abilities:$('abilities'), stats:$('stats'),
    weaknesses:$('weaknesses'), evolution:$('evolution'), prev:$('prevButton'), next:$('nextButton'), official:$('officialButton'),
    camera:$('cameraButton'), modal:$('scanModal'), close:$('closeModal'), input:$('imageInput'), choose:$('chooseImage'), preview:$('scanPreview'),
    scanBox:$('scanBox'), progress:$('progress'), progressBar:$('progressBar'), runAgain:$('runAgain'), recent:$('recentSection'), recentList:$('recentList')
  };
  let list = [], selected = null, worker = null, loadingList = null;

  const aliases = new Map([
    ['mr mime','mr-mime'],['mrmime','mr-mime'],['mime jr','mime-jr'],['mimejr','mime-jr'],['farfetchd','farfetchd'],["farfetch'd",'farfetchd'],
    ['sirfetchd','sirfetchd'],["sirfetch'd",'sirfetchd'],['type null','type-null'],['typenull','type-null'],['jangmo o','jangmo-o'],['hakamo o','hakamo-o'],['kommo o','kommo-o'],
    ['nidoran female','nidoran-f'],['nidoran male','nidoran-m'],['flabebe','flabebe'],['great tusk','great-tusk'],['scream tail','scream-tail'],['brute bonnet','brute-bonnet'],
    ['flutter mane','flutter-mane'],['slither wing','slither-wing'],['sandy shocks','sandy-shocks'],['iron treads','iron-treads'],['iron bundle','iron-bundle'],['iron hands','iron-hands'],
    ['iron jugulis','iron-jugulis'],['iron moth','iron-moth'],['iron thorns','iron-thorns'],['roaring moon','roaring-moon'],['walking wake','walking-wake'],['gouging fire','gouging-fire'],
    ['raging bolt','raging-bolt'],['iron boulder','iron-boulder'],['iron crown','iron-crown'],['mr rime','mr-rime']
  ]);
  const typeColors = {normal:'#a8a77a',fire:'#ee8130',water:'#6390f0',electric:'#f7d02c',grass:'#7ac74c',ice:'#96d9d6',fighting:'#c22e28',poison:'#a33ea1',ground:'#e2bf65',flying:'#a98ff3',psychic:'#f95587',bug:'#a6b91a',rock:'#b6a136',ghost:'#735797',dragon:'#6f35fc',dark:'#705746',steel:'#b7b7ce',fairy:'#d685ad'};
  const statLabels = {'hp':'HP','attack':'Attack','defense':'Defense','special-attack':'Sp. Atk','special-defense':'Sp. Def','speed':'Speed'};

  function normalize(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/♀/g,' female ').replace(/♂/g,' male ').replace(/[’']/g,'').replace(/[^a-z0-9]+/g,'').trim()}
  function slug(v){const raw=String(v||'').trim().toLowerCase();return aliases.get(raw)||aliases.get(normalize(raw))||raw.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’']/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')}
  function pretty(v){return String(v).split('-').map(x=>x?x[0].toUpperCase()+x.slice(1):x).join(' ')}
  function setStatus(msg,type=''){els.status.textContent=msg;els.status.className='status'+(type?' '+type:'')}
  function officialUrl(name){return `${POKEDEX_BASE}${encodeURIComponent(name)}`}

  async function loadList(){
    if(list.length)return list;if(loadingList)return loadingList;
    loadingList=fetch(LIST_URL).then(r=>{if(!r.ok)throw Error();return r.json()}).then(d=>d.results.map((p,i)=>({name:p.name,id:i+1,normalized:normalize(p.name)}))).catch(()=>[]);
    list=await loadingList;return list;
  }
  function levenshtein(a,b){if(a===b)return 0;if(!a)return b.length;if(!b)return a.length;if(a.length>b.length)[a,b]=[b,a];let p=Array.from({length:a.length+1},(_,i)=>i);for(let j=1;j<=b.length;j++){let c=[j];for(let i=1;i<=a.length;i++)c[i]=Math.min(c[i-1]+1,p[i]+1,p[i-1]+(a[i-1]===b[j-1]?0:1));p=c}return p[a.length]}
  async function findPokemon(input){
    const raw=String(input||'').trim();if(!raw)return null;const data=await loadList();const s=slug(raw),n=normalize(raw);
    if(/^\d{1,4}$/.test(raw)){const p=data.find(x=>x.id===Number(raw));if(p)return p}
    const exact=data.find(x=>x.name===s||x.normalized===n);if(exact)return exact;
    let best=null;for(const p of data){const d=levenshtein(n,p.normalized),ratio=1-d/Math.max(n.length,p.normalized.length);if(!best||ratio>best.ratio)best={p,ratio}}return best&&best.ratio>=(best.p.normalized.length<=5?.68:.62)?best.p:null;
  }
  async function json(url){const r=await fetch(url);if(!r.ok)throw Error(`HTTP ${r.status}`);return r.json()}

  async function loadEntry(p){
    const [pokemon,species]=await Promise.all([json(`${API}/pokemon/${p.name}`),json(`${API}/pokemon-species/${p.name}`)]);
    const [chain,typeDetails]=await Promise.all([json(species.evolution_chain.url),Promise.all(pokemon.types.map(t=>json(t.type.url)))]);
    return {pokemon,species,chain,typeDetails};
  }
  function englishFlavor(species){const entries=species.flavor_text_entries.filter(x=>x.language.name==='en');return (entries.find(x=>x.version.name==='scarlet')||entries.find(x=>x.version.name==='violet')||entries[0])?.flavor_text.replace(/[\n\f]/g,' ')||'No Pokédex description available.'}
  function englishGenus(species){return species.genera.find(x=>x.language.name==='en')?.genus||''}
  function flattenChain(node,out=[]){if(!node)return out;out.push(node.species.name);(node.evolves_to||[]).forEach(x=>flattenChain(x,out));return out}
  function renderTypes(types){els.types.innerHTML='';types.forEach(t=>{const s=document.createElement('span');s.className='type';s.textContent=t.type.name;s.style.background=typeColors[t.type.name]||'#777';els.types.appendChild(s)})}
  function renderStats(stats){els.stats.innerHTML='';stats.forEach(s=>{const row=document.createElement('div');row.className='stat';const name=document.createElement('div');name.className='stat-name';name.textContent=statLabels[s.stat.name]||pretty(s.stat.name);const val=document.createElement('div');val.className='stat-value';val.textContent=s.base_stat;const wrap=document.createElement('div');wrap.className='bar';const bar=document.createElement('i');bar.style.width=Math.min(100,s.base_stat/180*100)+'%';wrap.appendChild(bar);row.append(name,val,wrap);els.stats.appendChild(row)})}
  function renderWeaknesses(details){const mult={};details.forEach(d=>d.damage_relations.double_damage_from.forEach(t=>mult[t.name]=(mult[t.name]||1)*2));const arr=Object.entries(mult).filter(([,v])=>v>1).sort((a,b)=>b[1]-a[1]);els.weaknesses.innerHTML='';arr.forEach(([name,m])=>{const x=document.createElement('span');x.className='weak';x.textContent=`${pretty(name)} ×${m}`;els.weaknesses.appendChild(x)});if(!arr.length)els.weaknesses.innerHTML='<span class="weak">No major weaknesses</span>'}
  function renderEvolution(chain){const names=flattenChain(chain);els.evolution.innerHTML='';names.forEach((name,i)=>{const wrap=document.createElement('div');wrap.className='evo-item';const img=document.createElement('img');img.src=`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${awaitableId(name)}.png`;img.alt=pretty(name);img.loading='lazy';const label=document.createElement('strong');label.textContent=pretty(name);wrap.append(img,label);els.evolution.appendChild(wrap);if(i<names.length-1){const a=document.createElement('span');a.className='evo-arrow';a.textContent='→';els.evolution.appendChild(a)}})}
  function awaitableId(name){const p=list.find(x=>x.name===name);return p?p.id:name}
  async function ensureIds(names){await loadList();return names.map(n=>({name:n,id:list.find(p=>p.name===n)?.id||0}))}
  async function renderEvolutionAsync(chain){const nodes=flattenChain(chain);const withIds=await ensureIds(nodes);els.evolution.innerHTML='';withIds.forEach((x,i)=>{const wrap=document.createElement('div');wrap.className='evo-item';const img=document.createElement('img');img.src=`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${x.id||x.name}.png`;img.alt=pretty(x.name);img.loading='lazy';const label=document.createElement('strong');label.textContent=pretty(x.name);wrap.append(img,label);els.evolution.appendChild(wrap);if(i<nodes.length-1){const a=document.createElement('span');a.className='evo-arrow';a.textContent='→';els.evolution.appendChild(a)}})}

  async function showPokemon(p,source='typed'){
    selected=p;els.pokedex.classList.add('show');els.entry.hidden=true;els.loading.hidden=false;setStatus(source==='ocr'?'Loading the scanned Pokémon…':'Loading Pokédex entry…');
    try{
      const data=await loadEntry(p),{pokemon,species,chain,typeDetails}=data;
      els.number.textContent=`#${String(pokemon.id).padStart(4,'0')}`;els.heroName.textContent=pretty(pokemon.name);els.genus.textContent=englishGenus(species);els.art.src=pokemon.sprites.other?.['official-artwork']?.front_default||pokemon.sprites.front_default;els.art.alt=pretty(pokemon.name);renderTypes(pokemon.types);els.description.textContent=englishFlavor(species);els.height.textContent=`${(pokemon.height/10).toFixed(1)} m`;els.weight.textContent=`${(pokemon.weight/10).toFixed(1)} kg`;els.category.textContent=englishGenus(species).replace(/ Pokémon$/i,'')||'Pokémon';els.generation.textContent=pretty(species.generation.name.replace('generation-','Gen '));
      els.abilities.innerHTML='';pokemon.abilities.forEach(a=>{const x=document.createElement('div');x.className='ability';x.innerHTML=`${pretty(a.ability.name)}${a.is_hidden?' <small>(Hidden)</small>':''}`;els.abilities.appendChild(x)});renderStats(pokemon.stats);renderWeaknesses(typeDetails);await renderEvolutionAsync(chain);
      const id=pokemon.id;els.prev.disabled=id<=1;els.next.disabled=id>=1025;els.prev.onclick=()=>navigate(id-1);els.next.onclick=()=>navigate(id+1);els.official.onclick=()=>window.open(officialUrl(pokemon.name),'_blank','noopener');els.entry.hidden=false;els.loading.hidden=true;els.search.value=pretty(pokemon.name);setStatus(source==='ocr'?`OCR matched ${pretty(pokemon.name)}.`:'Pokédex entry loaded.','success');saveRecent(p);window.scrollTo({top:0,behavior:'smooth'});
    }catch(e){console.error(e);els.loading.hidden=true;setStatus('Could not load this Pokédex entry. Check your connection and try again.','error')}
  }
  async function navigate(id){const p=list.find(x=>x.id===id);if(p)showPokemon(p)}
  async function search(v,source='typed'){const raw=String(v||'').trim();if(!raw){setStatus('Enter a Pokémon name or number.','error');return}setStatus('Finding Pokémon…');try{const p=await findPokemon(raw);if(!p)throw Error();await showPokemon(p,source)}catch{setStatus(`I couldn't match “${raw}” to a Pokémon.`,'error')}}

  function getRecent(){try{return JSON.parse(localStorage.getItem('pokemon-recent')||'[]')}catch{return[]}}
  function saveRecent(p){try{let a=getRecent().filter(x=>x.name!==p.name);a.unshift({name:p.name,id:p.id});localStorage.setItem('pokemon-recent',JSON.stringify(a.slice(0,6)));renderRecent()}catch{}}
  function renderRecent(){const a=getRecent();els.recent.hidden=!a.length;els.recentList.innerHTML='';a.forEach(x=>{const b=document.createElement('button');b.className='recent-item';b.type='button';b.innerHTML=`<strong>${pretty(x.name)}</strong><span>#${String(x.id).padStart(4,'0')}</span>`;b.onclick=()=>search(x.name);els.recentList.appendChild(b)})}

  async function openScanner(){els.modal.classList.add('show');els.scanBox.textContent='Take a photo of a Pokémon name or choose an existing image. Good lighting and clear text work best.';els.progress.classList.remove('show');els.progressBar.style.width='0%';els.runAgain.hidden=true}
  async function runOCR(file){els.preview.src=URL.createObjectURL(file);els.preview.classList.add('show');els.progress.classList.add('show');els.scanBox.textContent='Reading text from image…';els.choose.disabled=true;try{if(!worker)worker=await Tesseract.createWorker('eng',1,{logger:m=>{if(m.status==='recognizing text')els.progressBar.style.width=Math.round((m.progress||0)*100)+'%'}});const {data}=await worker.recognize(file);const text=(data.text||'').trim();els.scanBox.textContent=text?`Detected: “${text}”`:'No readable text found.';if(text){await search(text,'ocr');els.modal.classList.remove('show')}}catch(e){console.error(e);els.scanBox.textContent='OCR failed. Try a clearer photo.'}finally{els.choose.disabled=false;els.runAgain.hidden=false;els.progress.classList.remove('show')}}

  els.form.addEventListener('submit',e=>{e.preventDefault();search(els.search.value)});els.camera.addEventListener('click',openScanner);els.close.addEventListener('click',()=>els.modal.classList.remove('show'));els.choose.addEventListener('click',()=>els.input.click());els.input.addEventListener('change',e=>{if(e.target.files?.[0])runOCR(e.target.files[0])});els.runAgain.addEventListener('click',()=>els.input.click());els.modal.addEventListener('click',e=>{if(e.target===els.modal)els.modal.classList.remove('show')});document.querySelectorAll('.chip').forEach(b=>b.addEventListener('click',()=>search(b.dataset.name)));renderRecent();loadList().then(()=>setStatus('Ready. Search for a Pokémon or scan one with the camera.','success')).catch(()=>setStatus('Ready.','success'));
})();
