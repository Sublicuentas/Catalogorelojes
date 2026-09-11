(function(){
  'use strict';

  var MOBILE_MAX = 700;
  var currentCatalog = null;
  var carouselTimer = 0;
  var ICON_VERSION = '20260911-fix3';
  var DEFAULT_MOBILE_CATEGORIES = [
    {id:'cine-series',name:'Cine y Series'},
    {id:'musica-premium',name:'Música Premium'},
    {id:'tv-digital',name:'TV Digital'},
    {id:'recargas-gaming',name:'Recargas Gaming'},
    {id:'ia-educacion',name:'IA y Educación'},
    {id:'zona-creativa',name:'Zona Creativa'},
    {id:'antivirus-software',name:'Antivirus y Software'},
    {id:'pase-flexible-vip',name:'Pase Flexible Vip'}
  ];

  function mobile(){ return window.matchMedia('(max-width:'+MOBILE_MAX+'px)').matches; }
  function esc(v){ return String(v == null ? '' : v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c];}); }
  function normalize(v){ return String(v||'').normalize ? String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase() : String(v||'').toLowerCase(); }
  function activeCategories(c){ return ((c&&c.categories)||[]).filter(function(x){return x.active!==false;}).sort(function(a,b){return Number(a.order||0)-Number(b.order||0);}); }
  function activeProducts(c){ return ((c&&c.products)||[]).filter(function(x){return x.active!==false && x.storeEnabled!==false && !x.redemptionOnly;}).sort(function(a,b){return Number(a.order||0)-Number(b.order||0);}); }
  function categoryName(c,id){ var x=activeCategories(c).find(function(v){return v.id===id;});return x?x.name:id; }
  function whatsapp(c){ return String((c&&c.settings&&c.settings.whatsapp)||'50432126332').replace(/\D/g,''); }
  function prettyPhone(p){
    var s=String(p||'').replace(/\D/g,'');
    if(s.indexOf('504')===0 && s.length===11) return '+504 '+s.slice(3,7)+'-'+s.slice(7);
    return s ? '+'+s : 'WhatsApp';
  }
  var ICON_BASE='/mobile-icons/';
  var ICON_FALLBACK_BASE='/assets/mobile-icons/';
  var CATEGORY_ICONS={
    'cine-series':'cine-series.png','musica-premium':'musica-premium.png','tv-digital':'tv-digital.png',
    'recargas-gaming':'recargas-gaming.png','ia-educacion':'ia-educacion.png','zona-creativa':'zona-creativa.png',
    'antivirus-software':'antivirus-software.png','agenda-deportiva':'agenda-deportiva.png','pase-flexible-vip':'pase-flexible-vip.png'
  };
  function iconUrl(base,file){ return base+file+'?v='+ICON_VERSION; }
  function iconImg(file,alt,cls){
    var a=esc(alt||''), c=cls?' class="'+esc(cls)+'"':'';
    var primary=iconUrl(ICON_BASE,file), fallback=iconUrl(ICON_FALLBACK_BASE,file);
    return '<img'+c+' src="'+primary+'" alt="'+a+'" loading="eager" decoding="async" onerror="if(!this.dataset.fb){this.dataset.fb=1;this.src=\''+fallback+'\';}else{this.onerror=null;this.style.visibility=\'hidden\';}">';
  }
  function categoryIconKey(c){
    var t=normalize(((c&&c.id)||'')+' '+((c&&c.name)||''));
    if(/pase.*flexible|flexible.*vip/.test(t)) return 'pase-flexible-vip';
    if(/agenda|mundial|deportiv/.test(t)) return 'agenda-deportiva';
    if(/cine|series|streaming/.test(t)) return 'cine-series';
    if(/musica|music/.test(t)) return 'musica-premium';
    if(/tv digital|iptv/.test(t)) return 'tv-digital';
    if(/recargas|gaming|juegos/.test(t)) return 'recargas-gaming';
    if(/ia|educacion|inteligencia artificial/.test(t)) return 'ia-educacion';
    if(/zona creativa|diseno|creativa/.test(t)) return 'zona-creativa';
    if(/antivirus|software|seguridad/.test(t)) return 'antivirus-software';
    return '';
  }
  function categoryIconMarkup(c){
    var key=categoryIconKey(c), file=CATEGORY_ICONS[key];
    return file?iconImg(file,(c&&c.name)||''):(c&&c.icon&&String(c.icon).trim()?esc(c.icon):'<span aria-hidden="true">•</span>');
  }
  function navIcon(file,alt){ return iconImg(file,alt); }
  function aboutIcon(file,alt){ return iconImg(file,alt); }
  function hideIntro(){
    var intro=document.getElementById('intro');
    if(!intro)return;
    intro.style.setProperty('display','none','important');
    intro.style.setProperty('visibility','hidden','important');
    intro.style.setProperty('opacity','0','important');
    intro.style.setProperty('pointer-events','none','important');
    try{if(intro.parentNode)intro.parentNode.removeChild(intro);}catch(_){ }
  }
  function activateLocalTab(id){
    var panel=document.getElementById('tab-'+id);
    if(!panel)return false;
    hideIntro();closeAbout();
    try{
      if(typeof window.openTabById==='function') window.openTabById(id);
      else if(typeof window.switchTab==='function') window.switchTab(id);
    }catch(_){ }
    document.querySelectorAll('.tp').forEach(function(p){
      var on=p===panel;p.classList.toggle('active',on);
      p.style.setProperty('display',on?'block':'none','important');
      p.style.setProperty('visibility',on?'visible':'hidden','important');
      p.style.setProperty('height',on?'auto':'0','important');
      p.style.setProperty('overflow',on?'visible':'hidden','important');
    });
    if(id==='cartelera'&&typeof window.loadCartelera==='function'){
      try{var b=document.querySelector('#carteleraApps .cart-app.active')||document.querySelector('#carteleraApps .cart-app');window.loadCartelera((b&&b.dataset.provider)||'netflix',b);}catch(_){ }
    }
    if(id==='mundial'&&typeof window.loadAgenda==='function'){try{window.loadAgenda();}catch(_){ }}
    setDockActive(id);window.scrollTo({top:0,behavior:'smooth'});return true;
  }
  function goHomeTab(id){
    if(location.pathname.replace(/\/+$/,'')==='/store' || document.body.classList.contains('sm-store-page')){
      location.href='/?tab='+encodeURIComponent(id)+'&skipIntro=1';return;
    }
    if(activateLocalTab(id))return;
    location.href='/?tab='+encodeURIComponent(id)+'&skipIntro=1';
  }
  function goProduct(id){
    if(mobile()) { location.href='/store#producto='+encodeURIComponent(id); return; }
    if(typeof window.openInlineCatalogProduct==='function' && document.getElementById('tab-inicio')) window.openInlineCatalogProduct(id);
    else location.href='/store#producto='+encodeURIComponent(id);
  }
  function goCategory(id){ location.href='/store?categoria='+encodeURIComponent(id); }

  function iconMarkup(p){
    if(p.imageUrl) return '<img src="'+esc(p.imageUrl)+'" alt="">';
    return '<span class="sm-search-placeholder">'+esc((p.visual||p.name||'?').slice(0,3).toUpperCase())+'</span>';
  }

  function buildHome(){
    var tab=document.getElementById('tab-inicio');
    if(!tab || document.getElementById('subliMobileHome')) return;
    var wrap=document.createElement('div');
    wrap.id='subliMobileHome';
    wrap.className='subli-mobile-home';
    wrap.innerHTML=''+
      '<div class="sm-search-shell" id="smSearchShell">'+
        '<label class="sm-search"><span>⌕</span><input id="subliMobileSearch" type="search" autocomplete="off" placeholder="Buscar Netflix, Canva, Office, IPTV…"><button class="sm-search-clear" id="smSearchClear" type="button" aria-label="Limpiar">×</button></label>'+
        '<div class="sm-search-results" id="subliMobileSearchResults"></div>'+
      '</div>'+
      '<section class="sm-carousel" id="subliMobileCarousel"><div class="sm-carousel-track" id="subliMobileCarouselTrack"><div class="sm-carousel-empty">Cargando promociones…</div></div><div class="sm-carousel-dots" id="subliMobileCarouselDots"></div></section>'+
      '<section><div class="sm-section-title"><h2>Categorías</h2><small id="smCategoryCount"></small></div><div class="sm-category-grid" id="subliMobileCategoryGrid"></div></section>'+
      '<button type="button" class="sm-cartelera-cta sm-agenda-cta" id="smAgendaCta"><span class="sm-cartelera-art sm-agenda-art">'+navIcon('agenda-deportiva.png','Agenda deportiva')+'</span><span><small>Partidos y eventos</small><strong>Agenda Deportiva</strong><p>Consulte ligas, partidos y eventos del día.</p></span><span class="sm-cartelera-arrow">›</span></button>';
    tab.insertBefore(wrap,tab.firstChild);

    var input=document.getElementById('subliMobileSearch');
    input.addEventListener('input',renderSearch);
    input.addEventListener('focus',renderSearch);
    input.addEventListener('keydown',function(e){
      if(e.key==='Enter'){
        var q=input.value.trim();
        if(q) location.href='/store?q='+encodeURIComponent(q);
      }
    });
    document.getElementById('smSearchClear').addEventListener('click',function(){input.value='';renderSearch();input.focus();});
    document.getElementById('smAgendaCta').addEventListener('click',function(){goHomeTab('mundial');});
    document.addEventListener('click',function(e){
      var shell=document.getElementById('smSearchShell');
      if(shell && !shell.contains(e.target)) shell.classList.remove('open');
    });
  }

  function renderSearch(){
    var input=document.getElementById('subliMobileSearch'), shell=document.getElementById('smSearchShell'), out=document.getElementById('subliMobileSearchResults');
    if(!input||!shell||!out) return;
    var q=input.value.trim(); shell.classList.toggle('has-value',Boolean(q));
    if(!q || !currentCatalog){ shell.classList.remove('open');out.innerHTML='';return; }
    var needle=normalize(q);
    var matches=activeProducts(currentCatalog).filter(function(p){
      return normalize([p.name,p.summary,categoryName(currentCatalog,p.categoryId)].concat((p.plans||[]).map(function(x){return x.name;})).join(' ')).indexOf(needle)!==-1;
    }).slice(0,6);
    out.innerHTML=matches.length?matches.map(function(p){return '<button type="button" class="sm-search-item" data-sm-product="'+esc(p.id)+'">'+iconMarkup(p)+'<span><strong>'+esc(p.name)+'</strong><small>'+esc(categoryName(currentCatalog,p.categoryId))+'</small></span><b>›</b></button>';}).join(''):'<div class="sm-search-empty">No encontramos servicios con “'+esc(q)+'”. Presione Enter para ver el catálogo.</div>';
    out.querySelectorAll('[data-sm-product]').forEach(function(b){b.addEventListener('click',function(){goProduct(b.getAttribute('data-sm-product'));});});
    shell.classList.add('open');
  }

  function runSlide(slide){
    if(!slide) return;
    if(slide.actionType==='tab') return goHomeTab(slide.actionValue||'promos');
    if(slide.actionType==='product') return goProduct(slide.actionValue||'');
    if(slide.actionType==='url' && /^https?:\/\//i.test(String(slide.actionValue||''))) window.open(slide.actionValue,'_blank','noopener,noreferrer');
  }

  function renderCarousel(){
    var track=document.getElementById('subliMobileCarouselTrack'),dots=document.getElementById('subliMobileCarouselDots');
    if(!track||!dots) return;
    var slides=((currentCatalog&&currentCatalog.carousel)||[]).filter(function(s){return s.active!==false;}).sort(function(a,b){return Number(a.order||0)-Number(b.order||0);});
    if(!slides.length){
      var legacy=document.querySelectorAll('#ncTrack .nc-card');
      if(legacy.length){
        track.innerHTML='';
        Array.prototype.forEach.call(legacy,function(card){
          var btn=document.createElement('button');btn.type='button';btn.className='sm-slide';
          var img=card.querySelector('img'); if(img){var clone=img.cloneNode(true);clone.removeAttribute('style');btn.appendChild(clone);} else {btn.innerHTML='<span class="sm-slide-copy"><h3>Promociones</h3><p>Consulte nuestras ofertas del mes.</p></span>';}
          btn.addEventListener('click',function(){card.click();});track.appendChild(btn);
        });
        slides=new Array(legacy.length).fill(null);
      }else{
        track.innerHTML='<div class="sm-carousel-empty">Las promociones aparecerán aquí.</div>';dots.innerHTML='';return;
      }
    }else{
      track.innerHTML=slides.map(function(s,i){
        var copy=Boolean(s.title||s.subtitle||s.badge||s.buttonLabel);
        return '<button type="button" class="sm-slide" data-sm-slide="'+i+'" style="background:linear-gradient(135deg,'+esc(s.accentFrom||'#102F54')+','+esc(s.accentTo||'#E2231A')+')">'+
          (s.imageUrl?'<img class="fit-'+esc(s.imageFit||'cover')+'" src="'+esc(s.imageUrl)+'" alt="'+esc(s.title||'Promoción')+'">':'')+
          (copy?'<span class="sm-slide-copy">'+(s.badge?'<span>'+esc(s.badge)+'</span>':'')+(s.title?'<h3>'+esc(s.title)+'</h3>':'')+(s.subtitle?'<p>'+esc(s.subtitle)+'</p>':'')+(s.buttonLabel?'<b>'+esc(s.buttonLabel)+' →</b>':'')+'</span>':'')+'</button>';
      }).join('');
      track.querySelectorAll('[data-sm-slide]').forEach(function(b){b.addEventListener('click',function(){runSlide(slides[Number(b.getAttribute('data-sm-slide'))]);});});
    }
    dots.innerHTML=slides.map(function(_,i){return '<i class="'+(i===0?'active':'')+'"></i>';}).join('');
    function setDot(){
      var idx=Math.max(0,Math.min(slides.length-1,Math.round(track.scrollLeft/Math.max(track.clientWidth,1))));
      dots.querySelectorAll('i').forEach(function(d,i){d.classList.toggle('active',i===idx);});
    }
    track.onscroll=function(){window.requestAnimationFrame(setDot);};
    if(carouselTimer) clearInterval(carouselTimer);
    if(slides.length>1){carouselTimer=setInterval(function(){if(!mobile()||document.hidden)return;var w=track.clientWidth||1,idx=Math.round(track.scrollLeft/w);track.scrollTo({left:((idx+1)%slides.length)*w,behavior:'smooth'});},4500);}
  }

  function renderCategories(){
    var grid=document.getElementById('subliMobileCategoryGrid'),count=document.getElementById('smCategoryCount');
    if(!grid) return;
    var cats=activeCategories(currentCatalog);
    if(!cats.length) cats = DEFAULT_MOBILE_CATEGORIES.slice();
    if(count) count.textContent=cats.length?cats.length+' secciones':'';
    grid.innerHTML=cats.map(function(c){return '<button type="button" class="sm-category" data-sm-category="'+esc(c.id)+'"><span class="sm-category-icon" aria-hidden="true">'+categoryIconMarkup(c)+'</span><strong>'+esc(c.name)+'</strong></button>';}).join('');
    grid.querySelectorAll('[data-sm-category]').forEach(function(b){b.addEventListener('click',function(){goCategory(b.getAttribute('data-sm-category'));});});
  }

  function buildDock(){
    if(document.getElementById('subliMobileDock')) return;
    var dock=document.createElement('nav');dock.id='subliMobileDock';dock.className='sm-mobile-dock';dock.setAttribute('aria-label','Navegación móvil');
    dock.innerHTML=''+
      '<button type="button" class="sm-dock-btn active" data-sm-nav="inicio"><span class="sm-dock-icon">'+navIcon('inicio.png','Inicio')+'</span><small>Inicio</small></button>'+
      '<button type="button" class="sm-dock-btn" data-sm-nav="cartelera"><span class="sm-dock-icon">'+navIcon('cartelera.png','Cartelera')+'</span><small>Cartelera</small></button>'+
      '<button type="button" class="sm-dock-btn" data-sm-nav="promos"><span class="sm-dock-icon">'+navIcon('ofertas.png','Ofertas')+'</span><small>Ofertas</small></button>'+
      '<button type="button" class="sm-dock-btn" data-sm-nav="sublibot"><span class="sm-dock-icon"><img src="/assets/sublibot-catalogo.png?v=20260824-v2" alt="Sublibot"></span><small>Sublibot</small></button>'+
      '<button type="button" class="sm-dock-btn" data-sm-nav="nosotros"><span class="sm-dock-icon">'+navIcon('nosotros.png','Nosotros')+'</span><small>Nosotros</small></button>';
    document.body.appendChild(dock);
    dock.querySelectorAll('[data-sm-nav]').forEach(function(b){b.addEventListener('click',function(){
      var id=b.getAttribute('data-sm-nav');
      if(id==='sublibot'){
        hideIntro(); closeAbout();
        if(location.pathname.replace(/\/+$/,'')==='/store'){location.href='/?open=sublibot&skipIntro=1';return;}
        if(typeof window.mascotAbrirChat==='function') window.mascotAbrirChat();
        setDockActive('sublibot');return;
      }
      if(id==='nosotros'){ hideIntro(); openAbout(); setDockActive('nosotros'); return; }
      goHomeTab(id);
    });});
  }
  function setDockActive(id){document.querySelectorAll('#subliMobileDock [data-sm-nav]').forEach(function(b){b.classList.toggle('active',b.getAttribute('data-sm-nav')===id);});}

  function aboutMarkup(){
    return '<div class="sm-about-handle"></div><div class="sm-about-head"><h2>Nosotros</h2><button type="button" class="sm-about-close" data-sm-about-close aria-label="Cerrar">×</button></div>'+
    '<div class="sm-about-intro"><img src="/assets/sublibot-catalogo.png?v=20260824-v2" alt="Sublibot"><div><strong>Sublicuentas · Honduras</strong><p>Acceso fácil, confiable y accesible a streaming, TV digital, juegos, software y herramientas online. Nuestro propósito: Conectamos tu entretenimiento.</p></div></div>'+
    aboutCard(aboutIcon('quienes-somos.png','Quiénes somos'),'Quiénes somos','<p>Sublicuentas nació en Honduras de la pasión por la tecnología y el entretenimiento. Trabajamos con innovación constante, compromiso con nuestros clientes y soluciones digitales eficientes a precios competitivos.</p>')+
    aboutCard(aboutIcon('terminos-condiciones.png','Términos y condiciones'),'Términos y condiciones','<h4>1. Información del servicio</h4><p>Ofrecemos acceso a cuentas, perfiles, licencias, IPTV y servicios digitales. Los productos se entregan digitalmente de forma inmediata o dentro del plazo indicado.</p><h4>2. Pagos</h4><ul><li>Transferencias: Ficohsa, BAC, Davivienda, Banpaís y Occidente.</li><li>Tigo Money y efectivo cuando aplique.</li><li>El servicio se activa al confirmar el pago.</li><li>No se emiten facturas fiscales.</li></ul><h4>3. Entrega</h4><ul><li>Entrega entre 15 y 30 minutos tras confirmar pago, vía WhatsApp.</li><li>Cuentas y licencias: garantía durante el tiempo contratado.</li><li>IPTV: garantía de funcionamiento de 24 horas.</li><li>Si la cuenta falla antes del tiempo contratado, se otorga reemplazo sin costo.</li></ul><h4>4. Reembolsos y garantías</h4><ul><li>No se aceptan devoluciones ni reembolsos una vez entregado o activado un servicio digital.</li><li>La garantía cubre acceso y funcionamiento; no problemas de red, incompatibilidad o desconocimiento técnico.</li><li>Recargas o keys no tienen devolución una vez activadas o enviadas.</li><li>En errores internos comprobables se realiza reposición o cambio de perfil, no devolución en efectivo.</li></ul><h4>5. Normas de uso</h4><ul><li>No modificar datos sensibles de la cuenta.</li><li>No compartir fuera de lo permitido por el plan.</li><li>No solicitar múltiples códigos de inicio.</li><li>Primera falta: advertencia; segunda falta: suspensión sin reembolso.</li></ul><h4>6. Reglas por plataforma</h4><ul><li>Netflix: si indica que el dispositivo no pertenece al hogar, usar “Estoy de viaje” o “Ver temporalmente”.</li><li>Disney+: si la TV no forma parte del hogar, usar “Estoy fuera del hogar”.</li><li>Prime Video: no usar la cuenta para alquiler de películas.</li><li>Códigos de inicio: enviar captura a soporte; expiran en 10–15 min.</li></ul>')+
    aboutCard(aboutIcon('devolucion-garantias.png','Política de devolución y garantías'),'Política de devolución y garantías','<ul><li><b>Servicios digitales:</b> no se aceptan devoluciones ni reembolsos una vez entregados o activados.</li><li><b>Responsabilidad del usuario:</b> la garantía cubre acceso y funcionamiento, no lentitud de red, incompatibilidad de dispositivos o desconocimiento técnico.</li><li><b>Cuentas y licencias:</b> garantía durante el tiempo adquirido, sujeta a revisión del estado de la cuenta.</li><li><b>IPTV:</b> garantía máxima de 24 horas para fallas del servidor; no aplica por velocidad de internet del cliente.</li><li><b>Recargas de juegos:</b> no aplica reembolso una vez enviada la recarga al ID suministrado.</li><li><b>Error interno comprobable:</b> se realiza reposición o cambio de perfil.</li></ul>')+
    aboutCard(aboutIcon('privacidad.png','Política de privacidad'),'Política de privacidad','<ul><li>Usamos su información únicamente para procesar pedidos, activar servicios y brindar soporte.</li><li>No compartimos ni vendemos datos personales a terceros.</li><li>La información se almacena de forma segura y solo personal autorizado tiene acceso.</li><li>Para modificar o eliminar datos: <b>soporte@sublicuentas.com</b>.</li></ul>')+
    aboutCard(aboutIcon('soporte.png','Atención y soporte'),'Atención y soporte','<p><b>Lunes a sábado:</b> 8:00 AM – 9:30 PM.</p><p><b>Domingo:</b> 11:00 AM – 6:00 PM.</p><p><b>Feriados:</b> 11:00 AM – 5:00 PM.</p><div class="sm-attention-box"><div><small>Número de atención</small><strong id="smSupportPhone">WhatsApp</strong></div><a id="smSupportLink" target="_blank" rel="noopener">Escribir</a></div>');
  }
  function aboutCard(icon,title,body){return '<section class="sm-about-card"><button type="button"><span class="sm-about-card-icon">'+icon+'</span>'+title+'<i>›</i></button><div class="sm-about-body">'+body+'</div></section>';}
  function buildAbout(){
    if(document.getElementById('smAboutOverlay')) return;
    var o=document.createElement('div');o.id='smAboutOverlay';o.className='sm-about-overlay';o.innerHTML='<div class="sm-about-sheet" role="dialog" aria-modal="true" aria-label="Nosotros">'+aboutMarkup()+'</div>';document.body.appendChild(o);
    o.addEventListener('click',function(e){if(e.target===o||e.target.closest('[data-sm-about-close]'))closeAbout();});
    o.querySelectorAll('.sm-about-card>button').forEach(function(b){b.addEventListener('click',function(){b.parentElement.classList.toggle('open');});});
    syncSupport();
  }
  function syncSupport(){
    var p=whatsapp(currentCatalog),phone=document.getElementById('smSupportPhone'),link=document.getElementById('smSupportLink');
    if(phone) phone.textContent=prettyPhone(p);
    if(link) link.href='https://wa.me/'+p+'?text='+encodeURIComponent('Hola, necesito atención de Sublicuentas.');
  }
  function openAbout(){hideIntro();buildAbout();document.body.classList.add('sm-about-open');document.getElementById('smAboutOverlay').classList.add('open');syncSupport();}
  function closeAbout(){var o=document.getElementById('smAboutOverlay');if(o)o.classList.remove('open');document.body.classList.remove('sm-about-open');if(document.getElementById('tab-inicio') && document.getElementById('tab-inicio').classList.contains('active'))setDockActive('inicio');}

  function sync(catalog){
    if(catalog) currentCatalog=catalog;
    if(document.getElementById('tab-inicio')){renderCategories();renderCarousel();renderSearch();}
    syncSupport();
  }

  function parseInitialHomeAction(){
    if(!document.getElementById('tab-inicio')) return;
    var q=new URLSearchParams(location.search), tab=q.get('tab'), open=q.get('open');
    setTimeout(function(){
      if(tab && ['inicio','cartelera','promos','mundial'].indexOf(tab)!==-1) goHomeTab(tab);
      if(open==='sublibot' && typeof window.mascotAbrirChat==='function'){window.mascotAbrirChat();setDockActive('sublibot');}
      if(open==='nosotros'){openAbout();setDockActive('nosotros');}
    },180);
  }

  function initStore(){
    if(location.pathname.replace(/\/+$/,'')==='/store' || document.getElementById('catalogSection')){
      document.body.classList.add('sm-store-page');
      setDockActive('');
    }
  }

  function init(){
    var params=new URLSearchParams(location.search);
    if(params.get('tab') || params.get('open') || params.get('skipIntro')) hideIntro();
    buildHome();buildDock();buildAbout();initStore();
    renderCategories();
    renderCarousel();
    if(window.__SUBLI_CATALOG__) sync(window.__SUBLI_CATALOG__);
    window.addEventListener('subli:catalog-updated',function(e){sync(e.detail||window.__SUBLI_CATALOG__);});
    parseInitialHomeAction();
    setTimeout(function(){sync(window.__SUBLI_CATALOG__||currentCatalog);},700);
    setTimeout(function(){ if(!currentCatalog){ renderCategories(); renderCarousel(); } },2500);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
