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
    formPickerWrap:$('formPickerWrap'), formSelector:$('formSelector')
  };
  let list = [], selected = null, loadingList = null;

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
    const raw=String(input||'').trim();
    if(!raw)return null;
    const s=slug(raw),n=normalize(raw);

    // 1. Check direct pokemon endpoint
    if(!/^\d{1,4}$/.test(raw)){
      try{
        const direct=await json(`${API}/pokemon/${encodeURIComponent(s)}`);
        return {name:direct.name,id:direct.id,normalized:normalize(direct.name)};
      }catch{}

      // 2. Fallback: check species endpoint for base forms (e.g. "deoxys", "giratina")
      try{
        const speciesData=await json(`${API}/pokemon-species/${encodeURIComponent(s)}`);
        if(speciesData?.varieties?.length){
          const defVar=speciesData.varieties.find(v=>v.is_default)||speciesData.varieties[0];
          return {name:defVar.pokemon.name,id:speciesData.id,normalized:normalize(defVar.pokemon.name)};
        }
      }catch{}
    }

    // 3. Fallback to list search and fuzzy matching
    const data=await loadList();
    if(!data.length) return null;
    if(/^\d{1,4}$/.test(raw)){
      const p=data.find(x=>x.id===Number(raw));
      if(p)return p;
    }
    const exact=data.find(x=>x.name===s||x.normalized===n);
    if(exact)return exact;

    // Try finding by prefix for multi-form pokemon (e.g. typing "deoxys" matches "deoxys-normal")
    const prefixMatch=data.find(x=>x.name.startsWith(s+'-'));
    if(prefixMatch)return prefixMatch;

    let best=null;
    for(const p of data){
      const d=levenshtein(n,p.normalized),ratio=1-d/Math.max(n.length,p.normalized.length);
      if(!best||ratio>best.ratio)best={p,ratio};
    }
    return best&&best.ratio>=(best.p.normalized.length<=5?.68:.62)?best.p:null;
  }

  async function json(url){
    const r=await fetch(url,{headers:{Accept:'application/json'}});
    if(!r.ok)throw Error(`HTTP ${r.status} for ${url}`);
    return r.json();
  }

  async function loadEntry(p){
    const pokemon=await json(`${API}/pokemon/${encodeURIComponent(p.name)}`);
    const species=await json(pokemon.species.url);
    const chainUrl = species?.evolution_chain?.url;
    const chainId = chainUrl?.match(/\/evolution-chain\/(\d+)\/?$/)?.[1];
    const chain = chainId ? await json(`${API}/evolution-chain/${chainId}`) : null;
    const typeDetails=await Promise.all((pokemon.types||[]).map(t=>json(t.type.url)));
    return {pokemon,species,chain,typeDetails};
  }

  function formatFormName(varietyName, baseSpeciesName){
    if (varietyName === baseSpeciesName) return 'Standard / Base';
    let label = varietyName.replace(baseSpeciesName + '-', '');
    return pretty(label);
  }

  function renderFormSelector(species, currentPokemonName){
    if(!els.formSelector || !els.formPickerWrap) return;
    const varieties = species?.varieties || [];
    if(varieties.length <= 1){
      els.formPickerWrap.hidden = true;
      els.formSelector.innerHTML = '';
      return;
    }

    els.formSelector.innerHTML = '';
    varieties.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.pokemon.name;
      opt.textContent = formatFormName(v.pokemon.name, species.name);
      if(v.pokemon.name === currentPokemonName) opt.selected = true;
      els.formSelector.appendChild(opt);
    });

    els.formSelector.onchange = (e) => {
      showPokemon({ name: e.target.value });
    };
    els.formPickerWrap.hidden = false;
  }

  function englishFlavor(species){const entries=species.flavor_text_entries.filter(x=>x.language.name==='en');return (entries.find(x=>x.version.name==='scarlet')||entries.find(x=>x.version.name==='violet')||entries[0])?.flavor_text.replace(/[\n\f]/g,' ')||'No Pokédex description available.'}
  function englishGenus(species){return species.genera.find(x=>x.language.name==='en')?.genus||''}
  function flattenChain(node,out=[],seen=new Set()){
    if(!node) return out;
    const name=node.species?.name;
    const url=node.species?.url || '';
    const match=url.match(/\/pokemon-species\/(\d+)\/?$/) \vert{}\vert{} url.match(/\/(\d+)\/?$/);
    const id=match ? Number(match[1]) : null;
    if(name && !seen.has(name)){
      seen.add(name);
      out.push({name,id});
    }
    for(const next of (Array.isArray(node.evolves_to) ? node.evolves_to : [])){
      flattenChain(next,out,seen);
    }
    return out;
  }
  function renderTypes(types){els.types.innerHTML='';(types||[]).forEach(t=>{const name=t?.type?.name;if(!name)return;const s=document.createElement('span');s.className='type';s.textContent=name;s.style.background=typeColors[name]||'#777';els.types.appendChild(s)})}
  function renderStats(stats){els.stats.innerHTML='';(stats||[]).forEach(s=>{const statName=s?.stat?.name;if(!statName)return;const row=document.createElement('div');row.className='stat';const name=document.createElement('div');name.className='stat-name';name.textContent=statLabels[statName]||pretty(statName);const val=document.createElement('div');val.className='stat-value';val.textContent=s.base_stat??'—';const wrap=document.createElement('div');wrap.className='bar';const bar=document.createElement('i');bar.style.width=Math.min(100,(s.base_stat||0)/180*100)+'%';wrap.appendChild(bar);row.append(name,val,wrap);els.stats.appendChild(row)})}
  function renderWeaknesses(details){const mult={};(details||[]).forEach(d=>(d?.damage_relations?.double_damage_from||[]).forEach(t=>{if(t?.name)mult[t.name]=(mult[t.name]||1)*2}));const arr=Object.entries(mult).filter(([,v])=>v>1).sort((a,b)=>b[1]-a[1]);els.weaknesses.innerHTML='';arr.forEach(([name,m])=>{const x=document.createElement('span');x.className='weak';x.textContent=`${pretty(name)} ×${m}`;x.style.background=typeColors[name]||'#777';x.style.color='#fff';x.style.textShadow='0 1px 1px #0005';els.weaknesses.appendChild(x)});if(!arr.length)els.weaknesses.innerHTML='<span class="weak">No major weaknesses</span>'}
  function renderEvolution(chain){
    const root=chain?.chain || chain;
    const nodes=flattenChain(root);
    els.evolution.innerHTML='';
    if(!nodes.length){els.evolution.innerHTML='<span class="weak">No evolution data available</span>';return;}

    nodes.forEach((x,i)=>{
      const wrap=document.createElement('button');
      wrap.type='button';
      wrap.className='evo-item';
      wrap.title=`View ${pretty(x.name)}`;
      wrap.setAttribute('aria-label',`View ${pretty(x.name)}`);
      wrap.addEventListener('click',()=>search(x.name,'evolution'));

      const img=document.createElement('img');
      img.src=x.id?`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${x.id}.png`:`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${encodeURIComponent(x.name)}.png`;
      img.alt=pretty(x.name);
      img.loading='lazy';

      const label=document.createElement('strong');
      label.textContent=pretty(x.name);
      wrap.append(img,label);
      els.evolution.appendChild(wrap);

      if(i<nodes.length-1){
        const a=document.createElement('span');
        a.className='evo-arrow';
        a.textContent='→';
        a.setAttribute('aria-hidden','true');
        els.evolution.appendChild(a);
      }
    });

    els.evolution.scrollLeft=0;
  }

  async function showPokemon(p,source='typed'){
    selected=p;els.pokedex.classList.add('show');els.entry.hidden=true;els.loading.hidden=false;setStatus('Loading Pokédex entry…');
    try{
      const data=await loadEntry(p),{pokemon,species,chain,typeDetails}=data;
      const displayId = species.id || pokemon.id;
      els.number.textContent=`#${String(displayId).padStart(4,'0')}`;
      els.heroName.textContent=pretty(pokemon.name);
      els.genus.textContent=englishGenus(species);
      els.art.src=pokemon.sprites.other?.['official-artwork']?.front_default||pokemon.sprites.front_default;
      els.art.alt=pretty(pokemon.name);
      renderTypes(pokemon.types);
      renderFormSelector(species, pokemon.name);
      els.description.textContent=englishFlavor(species);
      els.height.textContent=`${(pokemon.height/10).toFixed(1)} m`;
      els.weight.textContent=`${(pokemon.weight/10).toFixed(1)} kg`;
      els.category.textContent=englishGenus(species).replace(/ Pokémon$/i,'')||'Pokémon';
      els.generation.textContent=pretty(species.generation.name.replace('generation-','Gen '));
      els.abilities.innerHTML='';
      (pokemon.abilities||[]).forEach(a=>{
        const name=a?.ability?.name;
        if(!name)return;
        const x=document.createElement('div');
        x.className='ability';
        x.innerHTML=`${pretty(name)}${a.is_hidden?' <small>(Hidden)</small>':''}`;
        els.abilities.appendChild(x);
      });
      renderStats(pokemon.stats);
      renderWeaknesses(typeDetails);
      renderEvolution(chain);

      els.prev.disabled=displayId<=1;
      els.next.disabled=displayId>=1025;
      els.prev.onclick=()=>navigate(displayId-1);
      els.next.onclick=()=>navigate(displayId+1);
      els.official.onclick=()=>window.open(officialUrl(species.name||pokemon.name),'_blank','noopener');
      els.entry.hidden=false;
      els.loading.hidden=true;
      setStatus('Pokédex entry loaded.','success');
      window.scrollTo({top:0,behavior:'smooth'});
    }catch(e){
      console.error('Pokédex load failed:',e);
      els.loading.hidden=true;
      const detail=e?.message?` (${e.message})`:'';
      setStatus(`Could not load this Pokédex entry${detail}. Check your connection and try again.`,'error');
    }
  }

  async function navigate(id){
    if(id<1||id>1025)return;
    try{
      const spec = await json(`${API}/pokemon-species/${id}`);
      const defVar = spec.varieties.find(v => v.is_default) || spec.varieties[0];
      await showPokemon({ name: defVar.pokemon.name });
    }catch{
      try{
        const p = await json(`${API}/pokemon/${id}`);
        await showPokemon({ name: p.name, id: p.id });
      }catch(e){
        setStatus(`Could not load Pokémon #${id}.`,'error');
      }
    }
  }

  async function search(v,source='typed'){
    const raw=String(v||'').trim();
    if(!raw){setStatus('Enter a Pokémon name or number.','error');return}
    setStatus('Finding Pokémon…');
    try{
      const p=await findPokemon(raw);
      if(!p)throw Error();
      await showPokemon(p,source);
    }catch{
      setStatus(`I couldn't match “${raw}” to a Pokémon.`,'error');
    }
  }

  els.form.addEventListener('submit', e => {
    e.preventDefault();
    els.search.blur();
    search(els.search.value);
  });

  els.search.addEventListener('focus', () => els.search.value = '');

  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && document.activeElement !== els.search) {
      e.preventDefault();
      els.search.focus();
    }
  });

  setStatus('Ready. Search for a Pokémon by name or number.','success');
})();
