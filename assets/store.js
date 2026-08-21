(function () {
  'use strict';

  var STATUS = {
    available: { label: 'Disponible', className: 'available' },
    limited: { label: 'Pocas disponibles', className: 'limited' },
    on_request: { label: 'Bajo pedido', className: 'on-request' },
    paused: { label: 'No disponible', className: 'paused' },
    maintenance: { label: 'Mantenimiento', className: 'paused' }
  };

  var state = { catalog: null, category: 'all', query: '', selectedProductId: '', hashProductOpened: false };

  function byId(id) { return document.getElementById(id); }
  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  }
  function formatPrice(value) {
    if (value === null || value === undefined || value === '') return 'Consultar';
    var settings = state.catalog && state.catalog.settings || {};
    return (settings.currencyLabel || 'Lps.') + ' ' + Number(value).toLocaleString(
      settings.locale || 'es-HN',
      { minimumFractionDigits: Number(value)%1 ? 2 : 0, maximumFractionDigits: 2 }
    );
  }
  function statusOf(value) { return STATUS[value] || STATUS.available; }
  function categoryName(id) {
    var c = state.catalog && state.catalog.categories.find(function(x){ return x.id === id; });
    return c ? c.name : id;
  }
  function productById(id) {
    return state.catalog && state.catalog.products.find(function(p){ return p.id === id; });
  }
  function visualContent(item) {
    return item.imageUrl
      ? '<img src="'+escapeHtml(item.imageUrl)+'" alt="'+escapeHtml(item.name || item.title)+'">'
      : '<b>'+escapeHtml(item.visual || (item.name || item.title || '').slice(0,4).toUpperCase())+'</b>';
  }
  function whatsappUrl(text) {
    var settings = state.catalog && state.catalog.settings || {};
    var phone = String(settings.whatsapp || '50432126332').replace(/\D/g,'');
    return 'https://wa.me/'+phone+'?text='+encodeURIComponent(text);
  }
  async function api(url) {
    var response = await fetch(url, { headers:{ Accept:'application/json' }, cache:'no-store' });
    var data = await response.json().catch(function(){ return {}; });
    if (!response.ok || data.ok === false) throw new Error(data.error || 'No se pudo cargar el catálogo.');
    return data;
  }
  function productMinimumPrice(product) {
    var prices=[];
    (product.plans || []).filter(function(p){return p.active !== false;}).forEach(function(plan){
      if (Array.isArray(plan.options) && plan.options.length) {
        plan.options.forEach(function(o){ if(o.active !== false && o.price != null) prices.push(Number(o.price)); });
      } else if (plan.price != null) prices.push(Number(plan.price));
    });
    return prices.length ? Math.min.apply(Math,prices) : null;
  }
  async function loadCatalog() {
    var data=await api('/api/catalogo');
    state.catalog=data.catalog || {};
    state.catalog.categories=(state.catalog.categories || []).filter(function(c){return c.active !== false;}).sort(function(a,b){return (a.order||0)-(b.order||0);});
    state.catalog.products=(state.catalog.products || []).filter(function(p){return p.active !== false && !p.redemptionOnly;}).sort(function(a,b){return (a.order||0)-(b.order||0);});
    state.catalog.promotions=(state.catalog.promotions || []).filter(function(p){return p.active !== false;}).sort(function(a,b){return (a.order||0)-(b.order||0);});
    renderAll();
    configureConsultLinks();
    openRequestedProduct();
  }
  function configureConsultLinks(){
    var url=whatsappUrl('Hola, quisiera consultar información del catálogo y disponibilidad de servicios.');
    ['headerConsult','heroConsult'].forEach(function(id){ var el=byId(id); if(el) el.href=url; });
  }
  function renderCategories() {
    if(!state.catalog)return;
    var items=[{id:'all',name:'Todo',icon:'▦'}].concat(state.catalog.categories);
    byId('categoryFilters').innerHTML=items.map(function(c){
      return '<button type="button" class="category-filter'+(state.category===c.id?' active':'')+'" data-category="'+escapeHtml(c.id)+'">'+escapeHtml((c.icon||'')+' '+c.name)+'</button>';
    }).join('');
    byId('categoryFilters').querySelectorAll('[data-category]').forEach(function(btn){
      btn.addEventListener('click',function(){state.category=btn.dataset.category;renderCategories();renderProducts();});
    });
  }
  function renderProducts(){
    if(!state.catalog)return;
    var query=state.query.toLowerCase().trim();
    var products=state.catalog.products.filter(function(p){
      if(state.category!=='all' && p.categoryId!==state.category)return false;
      var hay=[p.name,p.summary,categoryName(p.categoryId)].concat((p.plans||[]).map(function(x){return x.name;})).join(' ').toLowerCase();
      return !query || hay.includes(query);
    });
    byId('emptyProducts').hidden=products.length>0;
    byId('productGrid').innerHTML=products.map(function(p){
      var status=statusOf(p.availability), price=productMinimumPrice(p);
      return '<article class="product-card" style="--accent:'+escapeHtml(p.accent||'#E2231A')+'">'+
        '<div class="product-visual">'+visualContent(p)+'</div>'+
        '<div class="product-body"><div class="product-top"><span class="availability-pill '+status.className+'">'+escapeHtml(status.label)+'</span><small>'+escapeHtml(categoryName(p.categoryId))+'</small></div>'+
        '<h3>'+escapeHtml(p.name)+'</h3><p>'+escapeHtml(p.summary||'')+'</p>'+
        '<div class="product-footer"><div><small>Desde</small><strong>'+escapeHtml(formatPrice(price))+'</strong></div>'+
        '<button type="button" data-view-product="'+escapeHtml(p.id)+'">Ver precios</button></div></div></article>';
    }).join('');
    byId('productGrid').querySelectorAll('[data-view-product]').forEach(function(btn){
      btn.addEventListener('click',function(){openProduct(btn.dataset.viewProduct);});
    });
  }
  function renderPromotions(){
    if(!state.catalog)return;
    var promos=state.catalog.promotions || [];
    var section=byId('promoSection');
    section.hidden=!promos.length;
    if(!promos.length)return;
    byId('promoTrack').innerHTML=promos.map(function(promo){
      var options=(promo.options||[]).filter(function(o){return o.active !== false;});
      var min=options.reduce(function(v,o){return o.price!=null?Math.min(v,Number(o.price)):v;},Infinity);
      return '<article class="promo-card" style="--accent:'+escapeHtml(promo.accent||'#E2231A')+'">'+
        '<div class="promo-copy"><span>'+escapeHtml(promo.badge||'OFERTA')+'</span><h3>'+escapeHtml(promo.title||promo.name||'Promoción')+'</h3><p>'+escapeHtml(promo.summary||promo.description||'')+'</p>'+
        (Number.isFinite(min)?'<strong>Desde '+escapeHtml(formatPrice(min))+'</strong>':'')+'</div>'+
        '<a target="_blank" rel="noopener" href="'+escapeHtml(whatsappUrl('Hola, quisiera consultar la promoción '+(promo.title||promo.name||'publicada en el catálogo')+'.'))+'">Consultar</a></article>';
    }).join('');
  }
  function renderAll(){renderCategories();renderProducts();renderPromotions();}
  function openProduct(id){
    var p=productById(id); if(!p)return;
    state.selectedProductId=id;
    var status=statusOf(p.availability);
    byId('productModalVisual').innerHTML=visualContent(p);
    byId('productModalStatus').textContent=status.label;
    byId('productModalStatus').className='availability-pill '+status.className;
    byId('productModalTitle').textContent=p.name;
    byId('productModalSummary').textContent=p.summary||'';
    var plans=(p.plans||[]).filter(function(x){return x.active !== false;});
    byId('productPlanSelect').innerHTML=plans.map(function(plan){return '<option value="'+escapeHtml(plan.id)+'">'+escapeHtml(plan.name)+'</option>';}).join('');
    updateProductSelection();
    byId('productModal').hidden=false;
    document.body.classList.add('modal-open');
  }
  function updateProductSelection(){
    var p=productById(state.selectedProductId); if(!p)return;
    var plan=(p.plans||[]).find(function(x){return x.id===byId('productPlanSelect').value;}) || (p.plans||[]).filter(function(x){return x.active!==false;})[0];
    if(!plan)return;
    if(byId('productPlanSelect').value!==plan.id)byId('productPlanSelect').value=plan.id;
    var options=(plan.options||[]).filter(function(o){return o.active !== false;});
    byId('productOptionWrap').hidden=!options.length;
    if(options.length){
      var prev=byId('productOptionSelect').value;
      byId('productOptionSelect').innerHTML=options.map(function(o){return '<option value="'+escapeHtml(o.id)+'">'+escapeHtml(o.label)+' · '+escapeHtml(formatPrice(o.price))+(o.bonus?' · '+escapeHtml(o.bonus):'')+'</option>';}).join('');
      if(options.some(function(o){return o.id===prev;}))byId('productOptionSelect').value=prev;
    }else byId('productOptionSelect').innerHTML='';
    var option=options.find(function(o){return o.id===byId('productOptionSelect').value;}) || options[0];
    var price=option ? option.price : plan.price;
    var features=(p.productFeatures||[]).concat(plan.features||[]);
    byId('productFeatures').innerHTML=features.map(function(f){return '<li>'+escapeHtml(f)+'</li>';}).join('');
    byId('productModalPrice').textContent=formatPrice(price)+(option?'':(plan.billingLabel||''));
    var detail=option ? plan.name+' · '+option.label : plan.name;
    byId('consultSelectedProduct').href=whatsappUrl('Hola, quisiera consultar '+p.name+' — '+detail+' ('+formatPrice(price)+').');
  }
  function closeModal(){
    byId('productModal').hidden=true;
    document.body.classList.remove('modal-open');
  }
  function openRequestedProduct(){
    if(state.hashProductOpened||!state.catalog)return;
    var params=new URLSearchParams(window.location.hash.replace(/^#/,''));
    var productId=params.get('producto');
    if(productId&&productById(productId)){state.hashProductOpened=true;setTimeout(function(){openProduct(productId);},0);}
  }
  function bindEvents(){
    byId('storeSearch').addEventListener('input',function(e){state.query=e.target.value||'';renderProducts();});
    byId('exploreProducts').addEventListener('click',function(){byId('catalogSection').scrollIntoView({behavior:'smooth'});});
    byId('productPlanSelect').addEventListener('change',updateProductSelection);
    byId('productOptionSelect').addEventListener('change',updateProductSelection);
    document.querySelectorAll('[data-close-modal="productModal"]').forEach(function(btn){btn.addEventListener('click',closeModal);});
    byId('productModal').addEventListener('click',function(e){if(e.target===byId('productModal'))closeModal();});
    document.querySelectorAll('[data-close-catalog]').forEach(function(btn){btn.addEventListener('click',function(){if(window.parent!==window){window.parent.postMessage({type:'close-sublistore'},'*');}else if(history.length>1){history.back();}else{location.href='/';}});});
    byId('promoPrev').addEventListener('click',function(){byId('promoTrack').scrollBy({left:-320,behavior:'smooth'});});
    byId('promoNext').addEventListener('click',function(){byId('promoTrack').scrollBy({left:320,behavior:'smooth'});});
    document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!byId('productModal').hidden)closeModal();});
  }
  async function boot(){
    bindEvents();
    try{await loadCatalog();}
    catch(error){byId('productGrid').innerHTML='<div class="empty-products">No se pudo cargar el catálogo. '+escapeHtml(error.message)+'</div>';}
  }
  boot();
})();