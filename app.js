/* AquaSource — logique applicative : routage, panier, formulaires, interactions */
(function(){
  "use strict";
  var D = window.AQUA_DATA;
  var P = window.AQUA_PAGES;
  var SETTINGS = D.SETTINGS || {};
  var FREE_SHIPPING_THRESHOLD = typeof SETTINGS.freeShippingThreshold === 'number' ? SETTINGS.freeShippingThreshold : 49;
  var STANDARD_SHIPPING_FEE = typeof SETTINGS.standardShippingFee === 'number' ? SETTINGS.standardShippingFee : 4.90;
  var EXPRESS_SHIPPING_FEE = typeof SETTINGS.expressShippingFee === 'number' ? SETTINGS.expressShippingFee : 6.90;

  var CART_KEY = 'aqua_cart_v1';
  var ORDERS_KEY = 'aqua_orders_v1';
  var SUB_KEY = 'aqua_subscription_v1';
  var PROFILE_KEY = 'aqua_profile_v1';
  var COOKIE_KEY = 'aqua_cookie_consent_v1';
  var RECENT_KEY = 'aqua_recent_v1';
  var CHAT_KEY = 'aqua_chat_leads_v1';
  var BUMP_PRODUCT_ID = 'p33';
  var BUMP_PRICE = 44.90;

  function safeGet(key){ try{ var v = JSON.parse(localStorage.getItem(key)); return v; }catch(e){ return null; } }
  function safeSet(key, val){ try{ localStorage.setItem(key, JSON.stringify(val)); }catch(e){} }

  var cart = safeGet(CART_KEY) || {};
  var promoApplied = false;
  var accountTab = 'orders';
  var pendingScrollTarget = null;

  function findProduct(id){ return D.PRODUCTS.filter(function(p){return p.id===id;})[0]; }
  function cartCount(){ var t=0; Object.keys(cart).forEach(function(id){t+=cart[id];}); return t; }
  function cartSubtotal(){ var t=0; Object.keys(cart).forEach(function(id){ var p=findProduct(id); if(p) t+=p.price*cart[id]; }); return t; }
  function saveCart(){ safeSet(CART_KEY, cart); }
  function loadOrders(){ return safeGet(ORDERS_KEY) || []; }
  function saveOrders(o){ safeSet(ORDERS_KEY, o); }
  function loadSub(){ return safeGet(SUB_KEY); }
  function saveSub(s){ safeSet(SUB_KEY, s); }
  function clearSub(){ try{ localStorage.removeItem(SUB_KEY); }catch(e){} }
  function loadProfile(){ return safeGet(PROFILE_KEY) || {}; }
  function saveProfile(p){ safeSet(PROFILE_KEY, p); }

  /* ---------- Cart mutations ---------- */
  function addToCart(id, qty){
    qty = qty || 1;
    cart[id] = (cart[id] || 0) + qty;
    saveCart();
    afterCartChange();
  }
  function changeQty(id, delta){
    if (!cart[id]) return;
    cart[id] += delta;
    if (cart[id] <= 0) delete cart[id];
    saveCart();
    afterCartChange();
  }
  function removeItem(id){
    delete cart[id];
    saveCart();
    afterCartChange();
  }
  function afterCartChange(){
    renderCartBadge();
    renderDrawer();
    var r = currentRoute();
    if (r.name === 'cart') renderCartPage();
    if (r.name === 'checkout') renderCheckout();
  }

  /* ---------- Header badge & drawer (persistent chrome) ---------- */
  function renderCartBadge(){
    var el = document.getElementById('cartCount');
    if (!el) return;
    var n = cartCount();
    if (n > 0){ el.hidden = false; el.textContent = n; } else { el.hidden = true; }
  }
  function renderDrawer(){
    var itemsEl = document.getElementById('cartItems');
    var footEl = document.getElementById('cartFoot');
    if (!itemsEl) return;
    var ids = Object.keys(cart);
    if (!ids.length){
      itemsEl.innerHTML = '<p class="cart-empty">Votre panier est vide.<br>Ajoutez une fontaine ou une cartouche pour commencer.</p>';
      footEl.hidden = true;
      return;
    }
    footEl.hidden = false;
    itemsEl.innerHTML = ids.map(function(id){
      var p = findProduct(id); if (!p) return '';
      var qty = cart[id];
      return '' +
        '<div class="cart-line" data-line="'+id+'">' +
          '<span class="icon-wrap"><svg width="30" height="30"><use href="#'+p.icon+'"/></svg>'+P.photoHtml(p)+'</span>' +
          '<div class="cart-line-body">' +
            '<strong>'+p.name+'</strong>' +
            '<div class="qty-row">' +
              '<button class="qty-btn" data-qty="-1" data-id="'+id+'" aria-label="Diminuer la quantité"><svg class="icon"><use href="#i-minus"/></svg></button>' +
              '<span class="qty-val">'+qty+'</span>' +
              '<button class="qty-btn" data-qty="1" data-id="'+id+'" aria-label="Augmenter la quantité"><svg class="icon"><use href="#i-plus"/></svg></button>' +
              '<button class="remove-btn" data-remove="'+id+'">Retirer</button>' +
            '</div>' +
          '</div>' +
          '<span class="line-price">'+P.money(p.price*qty)+'</span>' +
        '</div>';
    }).join('');
    var subtotal = cartSubtotal();
    var remaining = FREE_SHIPPING_THRESHOLD - subtotal;
    var pct = Math.min(100, (subtotal/FREE_SHIPPING_THRESHOLD)*100);
    document.getElementById('shipBar').style.width = pct + '%';
    document.getElementById('shipNote').innerHTML = remaining > 0 ? 'Plus que <strong>'+P.money(remaining)+'</strong> pour la livraison offerte.' : '<strong>Livraison offerte</strong> sur cette commande.';
    document.getElementById('cartSubtotalDrawer').innerHTML = P.money(subtotal);
  }

  var toastTimer = null;
  function showToast(text){
    var toast = document.getElementById('toast');
    document.getElementById('toastText').textContent = text;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ toast.classList.remove('show'); }, 2600);
  }

  /* ---------- Cookie consent ---------- */
  function initCookieBanner(){
    var consent = null;
    try{ consent = localStorage.getItem(COOKIE_KEY); }catch(e){}
    var banner = document.getElementById('cookieBanner');
    if (banner) banner.hidden = !!consent;
  }
  function setCookieConsent(value){
    try{ localStorage.setItem(COOKIE_KEY, value); }catch(e){}
    var banner = document.getElementById('cookieBanner');
    if (banner) banner.hidden = true;
  }

  /* ---------- Sticky mobile add-to-cart bar ---------- */
  var stickyObserver = null;
  function setupStickyAddBar(product){
    var bar = document.getElementById('stickyAddBar');
    var btn = document.getElementById('pdAddBtn');
    if (!bar || !btn || !product){ teardownStickyAddBar(); return; }
    document.getElementById('stickyAddName').textContent = product.name;
    document.getElementById('stickyAddPrice').innerHTML = P.money(product.price);
    document.getElementById('stickyAddBtn').setAttribute('data-add', product.id);
    bar.hidden = false;
    bar.classList.remove('show');
    if (stickyObserver) stickyObserver.disconnect();
    stickyObserver = new IntersectionObserver(function(entries){
      var e = entries[0];
      if (window.innerWidth > 760){ bar.classList.remove('show'); return; }
      if (!e.isIntersecting) bar.classList.add('show'); else bar.classList.remove('show');
    }, {threshold:0});
    stickyObserver.observe(btn);
  }
  function teardownStickyAddBar(){
    if (stickyObserver){ stickyObserver.disconnect(); stickyObserver = null; }
    var bar = document.getElementById('stickyAddBar');
    if (bar){ bar.hidden = true; bar.classList.remove('show'); }
  }

  /* ---------- Recently viewed ---------- */
  function updateRecentlyViewed(id){
    var list = safeGet(RECENT_KEY) || [];
    list = list.filter(function(x){ return x !== id; });
    list.unshift(id);
    list = list.slice(0, 6);
    safeSet(RECENT_KEY, list);
    renderRecentlyViewed(id);
  }
  function renderRecentlyViewed(currentId){
    var wrap = document.getElementById('recentlyViewedWrap');
    if (!wrap) return;
    var list = (safeGet(RECENT_KEY) || []).filter(function(x){ return x !== currentId; }).slice(0,3);
    var products = list.map(findProduct).filter(Boolean);
    if (!products.length){ wrap.innerHTML = ''; return; }
    wrap.innerHTML = '<section class="wrap"><div class="section-head"><div><p class="eyebrow">Historique</p><h2 style="font-size:1.3rem;">Récemment consultés</h2></div></div>' + P.productGrid(products) + '</section>';
  }

  /* ---------- Cart cross-sell ---------- */
  function cartCrossSellProducts(){
    var cats = {};
    Object.keys(cart).forEach(function(id){ var p = findProduct(id); if (p) cats[p.category] = true; });
    var ids = [];
    if ((cats.bonbonne || cats.reseau) && !cats.cartouche){ ids.push('p29', 'p31'); }
    if (cats.cartouche && !cats.accessoire){ ids.push('p33'); }
    if (!ids.length && (cats.bonbonne || cats.reseau)){ ids.push('p34'); }
    ids = ids.filter(function(id, i){ return ids.indexOf(id) === i && !cart[id]; }).slice(0,3);
    return ids.map(findProduct).filter(Boolean);
  }
  function crossSellHtml(products){
    if (!products.length) return '';
    return '<div class="crosssell-box"><p class="eyebrow">Complétez votre commande</p><div class="crosssell-grid">' +
      products.map(function(p){
        return '<div class="crosssell-card"><span class="icon-wrap"><svg width="22" height="22"><use href="#'+p.icon+'"/></svg>'+P.photoHtml(p)+'</span><div><strong>'+p.name+'</strong><span>'+P.money(p.price)+'</span></div><button class="crosssell-add" data-add="'+p.id+'" aria-label="Ajouter '+p.name+'"><svg class="icon"><use href="#i-plus"/></svg></button></div>';
      }).join('') +
    '</div></div>';
  }

  function openCart(){ document.getElementById('cartDrawer').classList.add('open'); document.getElementById('overlay').classList.add('open'); }
  function closeCart(){ document.getElementById('cartDrawer').classList.remove('open'); document.getElementById('overlay').classList.remove('open'); }
  function openMenu(){ document.getElementById('mobileNav').classList.add('open'); }
  function closeMenu(){ document.getElementById('mobileNav').classList.remove('open'); }

  /* ---------- Recherche catalogue ---------- */
  function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;'); }
  function normalizeSearch(s){
    return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
  }
  function openSearch(){
    document.getElementById('searchModal').classList.add('open');
    var input = document.getElementById('searchInput');
    renderSearchResults('');
    setTimeout(function(){ input.focus(); }, 10);
  }
  function closeSearch(){
    document.getElementById('searchModal').classList.remove('open');
  }
  function searchProducts(query){
    var q = normalizeSearch(query).trim();
    if (!q) return [];
    var terms = q.split(/\s+/).filter(Boolean);
    return D.PRODUCTS.filter(function(p){
      var cat = D.CATEGORIES[p.category] ? D.CATEGORIES[p.category].title : '';
      var haystack = normalizeSearch([p.name, p.brand, cat, p.specLine, p.shortDesc].join(' '));
      return terms.every(function(t){ return haystack.indexOf(t) !== -1; });
    }).slice(0, 8);
  }
  function renderSearchResults(query){
    var container = document.getElementById('searchResults');
    var q = query.trim();
    if (!q){
      container.innerHTML = '<p class="search-hint">Cherchez par nom de produit, marque ou catégorie — par exemple « cartouche charbon » ou « fontaine bureau ».</p>';
      return;
    }
    var results = searchProducts(q);
    if (!results.length){
      container.innerHTML = '<p class="search-empty">Aucun résultat pour « '+esc(q)+' ». Essayez un autre mot-clé, ou parcourez <a href="/fontaines-bonbonne">nos fontaines</a> et <a href="/cartouches-filtres">nos cartouches</a>.</p>';
      return;
    }
    container.innerHTML = results.map(function(p){
      return '<a class="search-result" href="/produit/'+p.id+'">' +
        '<span class="icon-wrap"><svg width="26" height="26"><use href="#'+p.icon+'"/></svg>'+P.photoHtml(p)+'</span>' +
        '<span class="search-result-info"><strong>'+esc(p.name)+'</strong><span>'+esc(p.specLine||'')+'</span></span>' +
        '<span class="search-result-price">'+P.money(p.price)+'</span>' +
      '</a>';
    }).join('');
  }

  /* ---------- Chat widget (assistant sans backend + capture d'email) ---------- */
  var CHAT_SUGGESTIONS = [
    'Quels sont les délais de livraison ?',
    'Comment fonctionne la garantie ?',
    'Puis-je résilier mon abonnement cartouches ?',
    'Faut-il un plombier pour une fontaine réseau ?'
  ];
  var chatMessages = [];
  var chatKbCache = null;

  function chatKB(){
    if (chatKbCache) return chatKbCache;
    var kb = [];
    (D.FAQ || []).forEach(function(item){ kb.push({ q: item.q, a: item.a }); });
    Object.keys(D.CATEGORIES || {}).forEach(function(key){
      var c = D.CATEGORIES[key];
      (c.faq || []).forEach(function(item){ kb.push({ q: item.q, a: item.a }); });
    });
    chatKbCache = kb;
    return kb;
  }

  function matchChatAnswer(query){
    var terms = normalizeSearch(query).split(/\s+/).filter(function(t){ return t.length >= 3; });
    if (!terms.length) return null;
    var best = null, bestScore = 0;
    chatKB().forEach(function(item){
      var hay = normalizeSearch(item.q + ' ' + item.a);
      var score = 0;
      terms.forEach(function(t){ if (hay.indexOf(t) !== -1) score++; });
      if (score > bestScore){ bestScore = score; best = item; }
    });
    return bestScore >= 1 ? best : null;
  }

  function openChat(){
    document.getElementById('chatPanel').classList.add('open');
    document.getElementById('chatFab').classList.add('open');
    if (!chatMessages.length){
      pushChatMessage('bot', "Bonjour, je suis l'assistant AquaSource. Posez-moi une question sur nos fontaines, nos cartouches, la livraison ou votre commande.");
      renderChatMessages(true);
    }
    var input = document.getElementById('chatInput');
    if (input) setTimeout(function(){ input.focus(); }, 50);
  }
  function closeChat(){
    document.getElementById('chatPanel').classList.remove('open');
    document.getElementById('chatFab').classList.remove('open');
  }
  function pushChatMessage(role, text, extra){
    var msg = { role: role, text: text };
    if (extra){ for (var k in extra){ msg[k] = extra[k]; } }
    chatMessages.push(msg);
    return msg;
  }
  function renderChatMessages(withSuggestions){
    var box = document.getElementById('chatMessages');
    if (!box) return;
    var html = chatMessages.map(function(m, i){
      if (m.type === 'lead-form'){
        if (m.done){
          return '<div class="chat-msg chat-msg-bot"><p>Merci ! Nous revenons vers vous par email dans les meilleurs délais.</p></div>';
        }
        return '<div class="chat-msg chat-msg-bot chat-lead"><p>' + esc(m.text) + '</p>' +
          '<form class="chat-lead-form" id="chatLeadForm" data-idx="' + i + '">' +
          '<input type="email" required placeholder="Votre email" id="chatLeadEmail" aria-label="Votre email">' +
          '<button type="submit" class="btn btn-primary btn-sm">Envoyer</button>' +
          '</form></div>';
      }
      return '<div class="chat-msg chat-msg-' + (m.role === 'user' ? 'user' : 'bot') + '"><p>' + esc(m.text) + '</p></div>';
    }).join('');
    if (withSuggestions){
      html += '<div class="chat-suggestions">' + CHAT_SUGGESTIONS.map(function(s){
        return '<button type="button" class="chat-chip">' + esc(s) + '</button>';
      }).join('') + '</div>';
    }
    box.innerHTML = html;
    box.scrollTop = box.scrollHeight;
  }
  function handleChatQuestion(text){
    text = String(text || '').trim();
    if (!text) return;
    pushChatMessage('user', text);
    var match = matchChatAnswer(text);
    if (match){
      pushChatMessage('bot', match.a);
    } else {
      pushChatMessage('bot', "Je n'ai pas de réponse précise à vous apporter sur ce point. Laissez-moi votre email et notre équipe vous recontacte sous 24h ouvrées.", { type: 'lead-form', question: text });
    }
    renderChatMessages(false);
  }
  function sendLeadToServer(email, question, source){
    // Envoie le prospect à la fonction serverless (Brevo) pour que vous le
    // receviez réellement par e-mail. Best-effort : si la fonction n'est pas
    // déployée (aperçu local, ou déploiement Netlify sans fonctions), l'échec
    // est silencieux — le prospect reste de toute façon enregistré localement
    // (voir CHAT_KEY / gestion du formulaire newsletter) comme filet de sécurité.
    try{
      fetch('/.netlify/functions/send-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, question: question || '', source: source || 'chat', page: location.href })
      }).catch(function(){});
    }catch(e){}
  }
  function submitChatLead(idx, email){
    var msg = chatMessages[idx];
    if (!msg || !email) return;
    var leads = safeGet(CHAT_KEY) || [];
    leads.push({ email: email, question: msg.question || '', date: new Date().toISOString() });
    safeSet(CHAT_KEY, leads);
    sendLeadToServer(email, msg.question, 'chat');
    msg.done = true;
    renderChatMessages(false);
  }

  /* ---------- Router ---------- */
  function currentRoute(){
    var path = location.pathname || '/';
    var parts = path.split('/').filter(Boolean);
    if (!parts.length) return {name:'home'};
    if (parts[0] === 'produit' && parts[1]) return {name:'product', id:parts[1]};
    if (parts[0] === 'conseils' && parts[1]) return {name:'article', slug:parts[1]};
    if (parts[0] === 'conseils') return {name:'bloglist'};
    if (parts[0] === 'professionnels') return {name:'pro'};
    if (parts[0] === 'panier') return {name:'cart'};
    if (parts[0] === 'commande') return {name:'checkout'};
    if (parts[0] === 'compte') return {name:'account'};
    if (parts[0] === 'contact') return {name:'contact'};
    if (parts[0] === 'faq') return {name:'faq'};
    if (parts[0] === 'livraison-retours') return {name:'shipping'};
    if (parts[0] === 'garantie-sav') return {name:'warranty'};
    if (parts[0] === 'mentions-legales') return {name:'legal'};
    if (parts[0] === 'cgv') return {name:'terms'};
    if (parts[0] === 'confidentialite') return {name:'privacy'};
    if (parts[0] === 'a-propos') return {name:'about'};
    if (parts[0] === 'qualite') return {name:'quality'};
    var catKey = null;
    Object.keys(D.CATEGORIES).forEach(function(k){ if (D.CATEGORIES[k].slug === parts[0]) catKey = k; });
    if (catKey) return {name:'category', key:catKey};
    return {name:'notfound'};
  }

  /* ---------- SEO: meta description + JSON-LD structured data ---------- */
  var SITE_URL = 'https://aquasourcefontaine.fr';
  var DEFAULT_OG_IMAGE = SITE_URL + '/og-image.png';
  function absUrl(path){ return SITE_URL + path; }
  function routePath(r){
    switch (r.name){
      case 'home': return '/';
      case 'category': return '/'+D.CATEGORIES[r.key].slug;
      case 'product': var p = findProduct(r.id); return p ? '/produit/'+p.id : '/';
      case 'pro': return '/professionnels';
      case 'bloglist': return '/conseils';
      case 'article': return '/conseils/'+r.slug;
      case 'cart': return '/panier';
      case 'checkout': return '/commande';
      case 'account': return '/compte';
      case 'contact': return '/contact';
      case 'faq': return '/faq';
      case 'shipping': return '/livraison-retours';
      case 'warranty': return '/garantie-sav';
      case 'legal': return '/mentions-legales';
      case 'terms': return '/cgv';
      case 'privacy': return '/confidentialite';
      case 'about': return '/a-propos';
      case 'quality': return '/qualite';
      default: return '/';
    }
  }
  function ogImageFor(r){
    if (r.name === 'product'){ var p = findProduct(r.id); if (p && p.image) return p.image; }
    return DEFAULT_OG_IMAGE;
  }
  function breadcrumbItems(r){
    var items = [{label:'Accueil', href:'/'}];
    switch (r.name){
      case 'category': items.push({label:D.CATEGORIES[r.key].title}); break;
      case 'product':
        var p = findProduct(r.id);
        if (!p) return null;
        var c = D.CATEGORIES[p.category];
        items.push({label:c.title, href:'/'+c.slug});
        items.push({label:p.name});
        break;
      case 'bloglist': items.push({label:'Conseils'}); break;
      case 'article':
        var art = D.BLOG.filter(function(a){return a.slug===r.slug;})[0];
        items.push({label:'Conseils', href:'/conseils'});
        if (art) items.push({label:art.title});
        break;
      case 'contact': items.push({label:'Contact'}); break;
      case 'faq': items.push({label:'FAQ'}); break;
      case 'shipping': items.push({label:'Livraison & retours'}); break;
      case 'warranty': items.push({label:'Garantie & SAV'}); break;
      case 'legal': items.push({label:'Mentions légales'}); break;
      case 'terms': items.push({label:'CGV'}); break;
      case 'privacy': items.push({label:'Confidentialité'}); break;
      case 'cart': items.push({label:'Panier'}); break;
      case 'checkout': items.push({label:'Panier', href:'/panier'}); items.push({label:'Commande'}); break;
      case 'account': items.push({label:'Mon compte'}); break;
      case 'about': items.push({label:'À propos'}); break;
      case 'quality': items.push({label:'Qualité'}); break;
      default: return null;
    }
    return items;
  }
  function seoDescription(r){
    switch (r.name){
      case 'home': return 'AquaSource : fontaines à eau à bonbonne et sur réseau, cartouches de filtration compatibles et accessoires, pour particuliers et professionnels. Livraison 24-48h, garantie 2 ans.';
      case 'category': var c = D.CATEGORIES[r.key]; return c ? c.intro : 'Boutique AquaSource.';
      case 'product': var p = findProduct(r.id); return p ? p.shortDesc : 'Produit AquaSource.';
      case 'pro': return 'Offres professionnelles AquaSource : fontaines à eau et contrats de maintenance pour entreprises.';
      case 'bloglist': return 'Conseils et guides AquaSource sur le choix et l\'entretien des fontaines à eau et cartouches de filtration.';
      case 'article': var art = D.BLOG.filter(function(a){return a.slug===r.slug;})[0]; return art ? art.excerpt : 'Article AquaSource.';
      case 'faq': return 'Questions fréquentes sur les fontaines à eau, cartouches de filtration et commandes AquaSource.';
      case 'shipping': return 'Délais, frais de livraison et modalités de retour des commandes AquaSource.';
      case 'warranty': return 'Garantie constructeur et service après-vente AquaSource pour vos fontaines à eau.';
      case 'legal': return 'Mentions légales du site AquaSource, édité par Monsieur David Grimbaum.';
      case 'terms': return 'Conditions générales de vente applicables aux commandes passées sur AquaSource.';
      case 'privacy': return 'Politique de confidentialité et gestion des cookies du site AquaSource.';
      case 'about': return 'L\'histoire, les valeurs et l\'équipe d\'AquaSource, spécialiste des fontaines à eau et de la filtration.';
      case 'quality': return D.QUALITY.intro;
      default: return 'AquaSource : fontaines à eau et cartouches de filtration.';
    }
  }
  function buildJsonLd(r){
    var graphs = [];
    graphs.push({
      '@context':'https://schema.org', '@type':'Organization', 'name':'AquaSource',
      'description':'Fontaines à eau et cartouches de filtration pour particuliers et professionnels.',
      'email':'hello@aquasource.fr',
      'address':{'@type':'PostalAddress','streetAddress':'47 rue Vivienne','postalCode':'75002','addressLocality':'Paris','addressCountry':'FR'}
    });
    if (r.name === 'product'){
      var p = findProduct(r.id);
      if (p){
        graphs.push({
          '@context':'https://schema.org', '@type':'Product', 'name':p.name, 'description':p.shortDesc,
          'image': p.image ? [p.image] : undefined,
          'brand': p.brand ? {'@type':'Brand','name':p.brand} : undefined,
          'url': absUrl('/produit/'+p.id),
          'offers':{'@type':'Offer','priceCurrency':'EUR','price':p.price.toFixed(2),'availability':'https://schema.org/InStock','url':absUrl('/produit/'+p.id)},
          'aggregateRating': p.rating ? {'@type':'AggregateRating','ratingValue':p.rating,'reviewCount':p.reviews} : undefined
        });
      }
    }
    var bc = breadcrumbItems(r);
    if (bc && bc.length > 1){
      graphs.push({
        '@context':'https://schema.org', '@type':'BreadcrumbList',
        'itemListElement': bc.map(function(it, i){
          var item = {'@type':'ListItem', 'position':i+1, 'name':it.label};
          if (it.href) item.item = absUrl(it.href);
          return item;
        })
      });
    }
    if (r.name === 'category'){
      var c = D.CATEGORIES[r.key];
      if (c && c.faq && c.faq.length){
        graphs.push({'@context':'https://schema.org', '@type':'FAQPage',
          'mainEntity': c.faq.map(function(f){ return {'@type':'Question','name':f.q,'acceptedAnswer':{'@type':'Answer','text':f.a}}; })});
      }
    }
    if (r.name === 'article'){
      var art = D.BLOG.filter(function(a){return a.slug===r.slug;})[0];
      if (art){
        graphs.push({
          '@context':'https://schema.org', '@type':'Article',
          'headline':art.title, 'description':art.excerpt,
          'author':{'@type':'Person','name':art.author||'AquaSource','jobTitle':'Responsable qualité de l\'eau','worksFor':{'@type':'Organization','name':'AquaSource'}},
          'publisher':{'@type':'Organization','name':'AquaSource'},
          'datePublished':art.date, 'dateModified':art.date
        });
      }
    }
    if (r.name === 'faq'){
      graphs.push({'@context':'https://schema.org', '@type':'FAQPage',
        'mainEntity': D.FAQ.map(function(f){ return {'@type':'Question','name':f.q,'acceptedAnswer':{'@type':'Answer','text':f.a}}; })});
    }
    if (r.name === 'quality' && D.QUALITY.faq && D.QUALITY.faq.length){
      graphs.push({'@context':'https://schema.org', '@type':'FAQPage',
        'mainEntity': D.QUALITY.faq.map(function(f){ return {'@type':'Question','name':f.q,'acceptedAnswer':{'@type':'Answer','text':f.a}}; })});
    }
    return graphs;
  }
  function setMeta(sel, attr, val){
    var el = document.querySelector(sel);
    if (!el){
      el = document.createElement('meta');
      if (sel.indexOf('property=') !== -1) el.setAttribute('property', sel.match(/property="([^"]+)"/)[1]);
      else if (sel.indexOf('name=') !== -1) el.setAttribute('name', sel.match(/name="([^"]+)"/)[1]);
      document.head.appendChild(el);
    }
    el.setAttribute(attr, val);
  }
  function updateSEO(r, pageTitle){
    try{
      var desc = seoDescription(r);
      var fullUrl = absUrl(routePath(r));
      var ogImage = ogImageFor(r);
      var title = pageTitle || 'AquaSource';

      setMeta('meta[name="description"]', 'content', desc);
      var noIndex = (r.name === 'cart' || r.name === 'checkout' || r.name === 'account');
      setMeta('meta[name="robots"]', 'content', noIndex ? 'noindex, follow' : 'index, follow');

      var linkEl = document.querySelector('link[rel="canonical"]');
      if (!linkEl){ linkEl = document.createElement('link'); linkEl.setAttribute('rel','canonical'); document.head.appendChild(linkEl); }
      linkEl.setAttribute('href', fullUrl);

      setMeta('meta[property="og:site_name"]', 'content', 'AquaSource');
      setMeta('meta[property="og:type"]', 'content', r.name === 'article' ? 'article' : (r.name === 'product' ? 'product' : 'website'));
      setMeta('meta[property="og:title"]', 'content', title);
      setMeta('meta[property="og:description"]', 'content', desc);
      setMeta('meta[property="og:url"]', 'content', fullUrl);
      setMeta('meta[property="og:image"]', 'content', ogImage);
      setMeta('meta[property="og:locale"]', 'content', 'fr_FR');
      setMeta('meta[name="twitter:card"]', 'content', 'summary_large_image');
      setMeta('meta[name="twitter:title"]', 'content', title);
      setMeta('meta[name="twitter:description"]', 'content', desc);
      setMeta('meta[name="twitter:image"]', 'content', ogImage);

      var old = document.getElementById('seo-jsonld');
      if (old) old.remove();
      var graphs = buildJsonLd(r);
      if (graphs.length){
        var s = document.createElement('script');
        s.type = 'application/ld+json';
        s.id = 'seo-jsonld';
        s.textContent = JSON.stringify(graphs.length === 1 ? graphs[0] : graphs);
        document.head.appendChild(s);
      }
    } catch(err){ /* SEO tags are an enhancement, never block rendering */ }
  }

  function updateActiveNav(r){
    var links = document.querySelectorAll('nav.main a, .mobile-nav-panel a');
    var target = null;
    if (r.name === 'category') target = '/' + D.CATEGORIES[r.key].slug;
    else if (r.name === 'product'){ var p = findProduct(r.id); if (p) target = '/' + D.CATEGORIES[p.category].slug; }
    else if (r.name === 'pro') target = '/professionnels';
    else if (r.name === 'bloglist' || r.name === 'article') target = '/conseils';
    else if (r.name === 'contact') target = '/contact';
    links.forEach(function(a){ a.classList.toggle('active', target !== null && a.getAttribute('href') === target); });
  }

  function render(){
    var r = currentRoute();
    var html, title = 'AquaSource';
    switch (r.name){
      case 'home': html = P.pageHome(); break;
      case 'category': html = P.pageCategory(r.key); title = D.CATEGORIES[r.key].title + ' — AquaSource'; break;
      case 'product': html = P.pageProduct(r.id); var pr = findProduct(r.id); if (pr) title = pr.name + ' — AquaSource'; break;
      case 'pro': html = P.pagePro(); title = 'Professionnels — AquaSource'; break;
      case 'bloglist': html = P.pageBlogList(); title = 'Conseils — AquaSource'; break;
      case 'article': html = P.pageBlogArticle(r.slug); var art = D.BLOG.filter(function(a){return a.slug===r.slug;})[0]; if (art) title = art.title + ' — AquaSource'; break;
      case 'cart': html = P.pageCartShell(); title = 'Panier — AquaSource'; break;
      case 'checkout': html = P.pageCheckoutShell(); title = 'Commande — AquaSource'; break;
      case 'account': html = P.pageAccountShell(); title = 'Mon compte — AquaSource'; break;
      case 'contact': html = P.pageContact(); title = 'Contact — AquaSource'; break;
      case 'faq': html = P.pageFaq(); title = 'FAQ — AquaSource'; break;
      case 'shipping': html = P.pageShipping(); title = 'Livraison & retours — AquaSource'; break;
      case 'warranty': html = P.pageWarranty(); title = 'Garantie & SAV — AquaSource'; break;
      case 'legal': html = P.pageLegal(); title = 'Mentions légales — AquaSource'; break;
      case 'terms': html = P.pageTerms(); title = 'CGV — AquaSource'; break;
      case 'privacy': html = P.pagePrivacy(); title = 'Confidentialité — AquaSource'; break;
      case 'about': html = P.pageAbout(); title = 'À propos — AquaSource'; break;
      case 'quality': html = P.pageQuality(); title = 'Qualité & filtration — AquaSource'; break;
      default: html = P.pageNotFound();
    }
    document.getElementById('app').innerHTML = html;
    document.title = title;
    updateSEO(r, title);
    if (pendingScrollTarget){
      var scrollTarget = document.getElementById(pendingScrollTarget);
      pendingScrollTarget = null;
      if (scrollTarget){ setTimeout(function(){ scrollTarget.scrollIntoView({behavior:'smooth', block:'start'}); }, 60); }
      else { window.scrollTo(0,0); }
    } else {
      window.scrollTo(0,0);
    }
    updateActiveNav(r);
    closeCart(); closeMenu();
    if (r.name === 'cart') renderCartPage();
    if (r.name === 'checkout') renderCheckout();
    if (r.name === 'account') { accountTab = 'orders'; renderAccount('orders'); }
    if (r.name === 'product' && pr){ setupStickyAddBar(pr); updateRecentlyViewed(pr.id); }
    else { teardownStickyAddBar(); }
  }

  /* ---------- Cart page ---------- */
  function renderCartPage(){
    var body = document.getElementById('cartPageBody');
    if (!body) return;
    var ids = Object.keys(cart);
    if (!ids.length){
      body.innerHTML = '<div class="empty-state"><span class="icon-wrap"><svg class="icon" style="width:1.6em;height:1.6em;"><use href="#i-cart"/></svg></span><h2 style="font-size:1.3rem;">Votre panier est vide</h2><p>Découvrez nos fontaines et cartouches pour commencer.</p><a class="btn btn-primary" href="/fontaines-bonbonne">Voir les fontaines</a></div>';
      return;
    }
    var linesHtml = ids.map(function(id){
      var p = findProduct(id); if (!p) return '';
      var qty = cart[id];
      return '' +
        '<div class="cart-page-line" data-line="'+id+'">' +
          '<span class="icon-wrap"><svg width="34" height="34"><use href="#'+p.icon+'"/></svg>'+P.photoHtml(p)+'</span>' +
          '<div><strong style="display:block;font-size:.92rem;"><a href="/produit/'+id+'" style="text-decoration:none;color:inherit;">'+p.name+'</a></strong>' +
            '<div class="qty-row" style="margin-top:8px;">' +
              '<button class="qty-btn" data-qty="-1" data-id="'+id+'" aria-label="Diminuer"><svg class="icon"><use href="#i-minus"/></svg></button>' +
              '<span class="qty-val">'+qty+'</span>' +
              '<button class="qty-btn" data-qty="1" data-id="'+id+'" aria-label="Augmenter"><svg class="icon"><use href="#i-plus"/></svg></button>' +
            '</div></div>' +
          '<span class="line-price">'+P.money(p.price*qty)+'</span>' +
          '<button class="remove-btn" data-remove="'+id+'">Retirer</button>' +
        '</div>';
    }).join('');

    var subtotal = cartSubtotal();
    var discount = promoApplied ? subtotal*0.10 : 0;
    var afterDiscount = subtotal - discount;
    var shipping = afterDiscount >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_FEE;
    var total = afterDiscount + shipping;

    var crossSell = crossSellHtml(cartCrossSellProducts());
    body.innerHTML = '' +
      '<div class="cart-page-grid">' +
        '<div>' +
          '<div class="cart-page-list">' + linesHtml + '</div>' +
          crossSell +
        '</div>' +
        '<div class="summary-box">' +
          '<h3 style="font-size:1.05rem;">Récapitulatif</h3>' +
          '<div class="summary-row"><span>Sous-total</span><span>'+P.money(subtotal)+'</span></div>' +
          (promoApplied ? '<div class="summary-row" style="color:var(--ok);"><span>Code AQUA10</span><span>-'+P.money(discount)+'</span></div>' : '') +
          '<div class="summary-row"><span>Livraison</span><span>'+(shipping===0 ? 'Offerte' : P.money(shipping))+'</span></div>' +
          '<div class="promo-row"><input type="text" id="promoInput" placeholder="Code promo"'+(promoApplied ? ' disabled value="AQUA10"' : '')+'><button class="btn btn-outline btn-sm" id="promoBtn" type="button">'+(promoApplied ? 'Appliqué' : 'Valider')+'</button></div>' +
          '<p class="field-error" id="promoMsg"></p>' +
          '<div class="summary-row total"><span>Total</span><span>'+P.money(total)+'</span></div>' +
          '<a class="btn btn-primary btn-block" href="/commande">Passer à la commande</a>' +
          '<p style="font-size:.76rem;color:var(--ink-soft);text-align:center;">Démonstration — paiement non réel.</p>' +
        '</div>' +
      '</div>';
  }

  /* ---------- Checkout page ---------- */
  function field(id, label, type, required){
    return '<div class="field"><label for="'+id+'">'+label+'</label><input id="'+id+'" type="'+type+'"'+(required?' required':'')+'><span class="field-error"></span></div>';
  }
  function radioRow(name, value, label, price, checked){
    return '<label style="display:flex;align-items:center;justify-content:space-between;gap:12px;border:1.5px solid var(--line);border-radius:10px;padding:12px 16px;cursor:pointer;">' +
      '<span style="display:flex;align-items:center;gap:10px;font-size:.88rem;font-weight:600;"><input type="radio" name="'+name+'" value="'+value+'"'+(checked?' checked':'')+'> '+label+'</span>' +
      '<span style="font-family:var(--font-mono);font-weight:700;">'+price+'</span>' +
    '</label>';
  }
  function renderCheckout(){
    var body = document.getElementById('checkoutBody');
    if (!body) return;
    var ids = Object.keys(cart);
    if (!ids.length){
      body.innerHTML = '<div class="empty-state"><span class="icon-wrap"><svg class="icon" style="width:1.6em;height:1.6em;"><use href="#i-cart"/></svg></span><h2 style="font-size:1.3rem;">Votre panier est vide</h2><p>Ajoutez un produit avant de passer commande.</p><a class="btn btn-primary" href="/">Retour à la boutique</a></div>';
      return;
    }
    var subtotal = cartSubtotal();
    var discount = promoApplied ? subtotal*0.10 : 0;
    var afterDiscount = subtotal - discount;
    var shipping = afterDiscount >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_FEE;
    var bumpProduct = findProduct(BUMP_PRODUCT_ID);
    var showBump = bumpProduct && !cart[BUMP_PRODUCT_ID];

    body.innerHTML = '' +
      '<div class="cart-page-grid">' +
        '<form class="form-card" id="checkoutForm" novalidate>' +
          '<h3 style="font-size:1.05rem;margin-bottom:16px;">Adresse de livraison</h3>' +
          '<div class="form-grid">' +
            field('coFirst','Prénom','text',true) + field('coLast','Nom','text',true) +
            '<div class="field full">'+field('coAddress','Adresse','text',true).replace('<div class="field">','').replace('</div>','')+'</div>' +
            field('coZip','Code postal','text',true) + field('coCity','Ville','text',true) +
            '<div class="field full">'+field('coPhone','Téléphone (optionnel)','tel',false).replace('<div class="field">','').replace('</div>','')+'</div>' +
          '</div>' +
          '<h3 style="font-size:1.05rem;margin:22px 0 12px;">Mode de livraison</h3>' +
          '<div style="display:flex;flex-direction:column;gap:10px;">' +
            radioRow('shipMode','standard','Standard (24-48h)', shipping===0 ? 'Offerte' : P.money(shipping), true) +
            radioRow('shipMode','express','Express (24h)', P.money(EXPRESS_SHIPPING_FEE), false) +
          '</div>' +
          (showBump ? '<label class="bump-box" for="bumpCheckbox"><input type="checkbox" id="bumpCheckbox"><span><strong>Ajouter '+bumpProduct.name+'</strong><p>Profitez-en à <span class="bump-price">'+P.money(BUMP_PRICE)+'</span> au lieu de '+P.money(bumpProduct.price)+', uniquement au moment de la commande.</p></span></label>' : '') +
          '<h3 style="font-size:1.05rem;margin:22px 0 12px;">Mode de paiement</h3>' +
          '<div class="paypal-box">' +
            '<span class="paypal-wordmark">Pay<em>Pal</em></span>' +
            '<p>Vous serez redirigé vers PayPal pour régler en toute sécurité. <strong>Aucun compte PayPal n\'est nécessaire</strong> : vous pouvez payer directement par carte bancaire (CB, Visa, Mastercard).</p>' +
          '</div>' +
          '<div class="disclaimer-note">Démonstration — le paiement PayPal n\'est pas encore connecté sur cette version du site : aucune information bancaire n\'est demandée et aucun paiement réel n\'est déclenché par ce formulaire.</div>' +
          '<button class="btn btn-paypal btn-block" type="submit" style="margin-top:18px;">Payer avec PayPal</button>' +
          '<p class="secure-note"><svg class="icon"><use href="#i-lock"/></svg> Paiement 100% sécurisé — vos informations ne sont jamais partagées.</p>' +
        '</form>' +
        '<div class="summary-box">' +
          '<h3 style="font-size:1.05rem;">Votre commande</h3>' +
          ids.map(function(id){ var p = findProduct(id); if(!p) return ''; return '<div class="summary-row"><span>'+cart[id]+' × '+p.name+'</span><span>'+P.money(p.price*cart[id])+'</span></div>'; }).join('') +
          '<div class="summary-row"><span>Sous-total</span><span>'+P.money(subtotal)+'</span></div>' +
          (promoApplied ? '<div class="summary-row" style="color:var(--ok);"><span>Code AQUA10</span><span>-'+P.money(discount)+'</span></div>' : '') +
          '<div class="summary-row" id="checkoutShipRow"><span>Livraison</span><span id="checkoutShipVal">'+(shipping===0?'Offerte':P.money(shipping))+'</span></div>' +
          '<div class="summary-row" id="bumpRow" hidden><span>'+(bumpProduct?bumpProduct.name:'')+'</span><span>'+P.money(BUMP_PRICE)+'</span></div>' +
          '<div class="summary-row total"><span>Total</span><span id="checkoutTotalVal">'+P.money(afterDiscount+shipping)+'</span></div>' +
        '</div>' +
      '</div>';
  }

  function handleCheckoutSubmit(form){
    var requiredIds = ['coFirst','coLast','coAddress','coZip','coCity'];
    var valid = true;
    requiredIds.forEach(function(id){
      var el = document.getElementById(id);
      if (!el) return;
      var fieldEl = el.closest('.field');
      var errEl = fieldEl ? fieldEl.querySelector('.field-error') : null;
      if (!el.value.trim()){
        valid = false;
        if (fieldEl) fieldEl.classList.add('has-error');
        if (errEl) errEl.textContent = 'Champ requis';
      } else {
        if (fieldEl) fieldEl.classList.remove('has-error');
        if (errEl) errEl.textContent = '';
      }
    });
    if (!valid) return;

    var shipModeEl = form.querySelector('input[name="shipMode"]:checked');
    var shipMode = shipModeEl ? shipModeEl.value : 'standard';
    var subtotal = cartSubtotal();
    var discount = promoApplied ? subtotal*0.10 : 0;
    var afterDiscount = subtotal - discount;
    var shipping = shipMode === 'express' ? EXPRESS_SHIPPING_FEE : (afterDiscount >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_FEE);
    var bumpEl = document.getElementById('bumpCheckbox');
    var bumpChecked = bumpEl && bumpEl.checked;
    var bumpProduct = bumpChecked ? findProduct(BUMP_PRODUCT_ID) : null;
    var total = afterDiscount + shipping + (bumpChecked ? BUMP_PRICE : 0);
    var orderId = 'AQ-' + Math.floor(10000 + Math.random()*89999);
    var orderedIds = Object.keys(cart);
    var upsell = null;
    orderedIds.forEach(function(id){
      if (upsell) return;
      var op = findProduct(id);
      if (op && op.bundleWith && orderedIds.indexOf(op.bundleWith) === -1 && (!bumpProduct || op.bundleWith !== bumpProduct.id)){
        upsell = findProduct(op.bundleWith);
      }
    });
    var orderItems = Object.keys(cart).map(function(id){ var p = findProduct(id); return {id:id, name: p?p.name:id, qty:cart[id], price:p?p.price:0}; });
    if (bumpProduct){ orderItems.push({id:bumpProduct.id, name: bumpProduct.name + ' (offre commande)', qty:1, price: BUMP_PRICE}); }
    var order = {
      id: orderId,
      date: new Date().toLocaleDateString('fr-FR'),
      items: orderItems,
      total: total
    };
    var orders = loadOrders();
    orders.unshift(order);
    saveOrders(orders);

    cart = {};
    saveCart();
    promoApplied = false;
    renderCartBadge();
    renderDrawer();

    var deliveryDays = shipMode === 'express' ? 1 : 2;
    var deliveryDate = new Date(Date.now() + deliveryDays*86400000).toLocaleDateString('fr-FR', {weekday:'long', day:'numeric', month:'long'});
    var headEyebrow = document.querySelector('.page-head .eyebrow');
    var headTitle = document.querySelector('.page-head h1');
    var headLead = document.querySelector('.page-head p');
    if (headEyebrow) headEyebrow.textContent = 'Étape 3/3';
    if (headTitle) headTitle.textContent = 'Merci pour votre commande';
    if (headLead) headLead.textContent = 'Votre commande de démonstration a bien été enregistrée.';
    var body = document.getElementById('checkoutBody');
    body.innerHTML = '' +
      '<div class="order-success">' +
        '<span class="icon-wrap"><svg class="icon"><use href="#i-check"/></svg></span>' +
        '<h2>Commande confirmée</h2>' +
        '<p class="order-num">#'+orderId+'</p>' +
        '<p>Un e-mail de confirmation vous serait envoyé. Livraison estimée : <strong>'+deliveryDate+'</strong>.</p>' +
        '<p class="disclaimer-note">Démonstration — aucun paiement réel n\'a été effectué.</p>' +
        '<div class="hero-ctas" style="justify-content:center;"><a class="btn btn-primary" href="/compte">Voir mes commandes</a><a class="btn btn-outline" href="/">Continuer mes achats</a></div>' +
      '</div>' +
      (upsell ? '<div class="bundle-box" style="max-width:560px;margin-inline:auto;">' +
        '<p class="eyebrow">Pour aller plus loin</p>' +
        '<div class="bundle-items">' +
          '<div class="bundle-item"><span class="icon-wrap"><svg width="24" height="24"><use href="#'+upsell.icon+'"/></svg>'+P.photoHtml(upsell)+'</span><div><strong>'+upsell.name+'</strong><span>'+P.money(upsell.price)+'</span></div></div>' +
        '</div>' +
        '<div class="bundle-foot"><span class="bundle-total">Complétez votre installation dès votre prochaine commande.</span>' +
        '<button class="btn btn-primary btn-sm" data-add="'+upsell.id+'">Ajouter au panier</button></div>' +
      '</div>' : '');
  }

  /* ---------- Account page ---------- */
  function renderAccount(tab){
    accountTab = tab || accountTab;
    var body = document.getElementById('accountBody');
    if (!body) return;
    var tabs = [['orders','Mes commandes'],['subscription','Abonnement cartouches'],['profile','Mes informations']];
    var tabsHtml = tabs.map(function(t){ return '<button class="account-tab'+(accountTab===t[0]?' active':'')+'" data-tab="'+t[0]+'">'+t[1]+'</button>'; }).join('');
    var panel = '';

    if (accountTab === 'orders'){
      var orders = loadOrders();
      panel = orders.length ? orders.map(function(o){
        return '<div class="order-row"><span><strong>#'+o.id+'</strong><br><span style="color:var(--ink-soft);font-size:.8rem;">'+o.date+' · '+o.items.length+' article(s)</span></span><span class="order-status">Confirmée</span><span style="font-family:var(--font-mono);font-weight:700;">'+P.money(o.total)+'</span></div>';
      }).join('') : '<div class="empty-state" style="padding-block:40px;"><span class="icon-wrap"><svg class="icon"><use href="#i-truck"/></svg></span><p>Aucune commande pour le moment.</p><a class="btn btn-outline btn-sm" href="/">Voir la boutique</a></div>';
    } else if (accountTab === 'subscription'){
      var sub = loadSub();
      if (sub){
        var p = findProduct(sub.productId);
        panel = '<div class="pricing-card highlight" style="max-width:440px;">' +
          '<span class="tag">Abonnement actif</span>' +
          '<h3 style="font-size:1.05rem;">'+(p ? p.name : sub.productId)+'</h3>' +
          '<p style="font-size:.85rem;color:var(--ink-soft);">Renouvellement tous les '+sub.frequency+' mois · -15% à chaque envoi</p>' +
          '<p class="paypal-note"><svg class="icon"><use href="#i-lock"/></svg> Facturé automatiquement via PayPal · résiliable à tout moment</p>' +
          '<button class="btn btn-outline btn-sm" id="cancelSubBtn" type="button" style="align-self:flex-start;">Résilier l\'abonnement</button>' +
        '</div>';
      } else {
        var cartridges = D.PRODUCTS.filter(function(x){ return x.subscription; });
        panel = '<form class="form-card" id="subForm" style="max-width:460px;">' +
          '<h3 style="font-size:1.05rem;margin-bottom:14px;">Activer un abonnement</h3>' +
          '<div class="field"><label for="subProduct">Cartouche</label><select id="subProduct">' + cartridges.map(function(c){ return '<option value="'+c.id+'">'+c.name+'</option>'; }).join('') + '</select></div>' +
          '<div class="field" style="margin-top:12px;"><label for="subFreq">Fréquence</label><select id="subFreq"><option value="3">Tous les 3 mois</option><option value="6">Tous les 6 mois</option></select></div>' +
          '<button class="btn btn-paypal btn-block" type="submit" style="margin-top:16px;">Activer avec PayPal (-15%)</button>' +
          '<p class="paypal-note"><svg class="icon"><use href="#i-lock"/></svg> Prélèvement automatique récurrent géré par PayPal, sans compte PayPal obligatoire pour payer par carte. Démonstration — aucun prélèvement réel n\'est déclenché.</p>' +
        '</form>';
      }
    } else if (accountTab === 'profile'){
      var pr = loadProfile();
      panel = '<form class="form-card" id="profileForm" style="max-width:460px;">' +
        '<div class="form-grid">' +
          '<div class="field full"><label for="pfName">Nom complet</label><input id="pfName" value="'+(pr.name||'')+'"></div>' +
          '<div class="field full"><label for="pfEmail">E-mail</label><input id="pfEmail" type="email" value="'+(pr.email||'')+'"></div>' +
          '<div class="field full"><label for="pfAddress">Adresse</label><input id="pfAddress" value="'+(pr.address||'')+'"></div>' +
        '</div>' +
        '<button class="btn btn-primary" type="submit" style="margin-top:16px;">Enregistrer</button>' +
        '<p class="field-error" id="profileMsg" style="color:var(--ok);"></p>' +
      '</form>';
    }
    body.innerHTML = '<div class="account-grid"><div class="account-tabs">'+tabsHtml+'</div><div class="account-panel">'+panel+'</div></div>';
  }

  /* ---------- Category filter/sort ---------- */
  function refreshCategoryGrid(){
    var wrap = document.getElementById('categoryGridWrap');
    if (!wrap) return;
    var key = wrap.getAttribute('data-category');
    var activeBtn = document.querySelector('.filter-chips .btn.active');
    var filter = activeBtn ? activeBtn.getAttribute('data-filter') : 'all';
    var sortVal = (document.getElementById('sortSelect') || {}).value || 'pop';
    var list = D.PRODUCTS.filter(function(p){ return p.category === key; });
    if (filter && filter !== 'all') list = list.filter(function(p){ return p.badge === filter; });
    list = list.slice();
    if (sortVal === 'asc') list.sort(function(a,b){ return a.price - b.price; });
    else if (sortVal === 'desc') list.sort(function(a,b){ return b.price - a.price; });
    else if (sortVal === 'rating') list.sort(function(a,b){ return b.rating - a.rating; });
    wrap.innerHTML = P.productGrid(list);
  }

  /* ---------- Finder recommendations ---------- */
  var RECS = {
    particulier: [
      {icon:'p-bonbonne', name:'Fontaine à Eau avec Bonbonne M-77', note:'572,40 € — idéale pour la cuisine ou le salon', id:'p1'},
      {icon:'p-carbon', name:'Filtre à Charbon Actif Universel', note:'81,00 € — à renouveler tous les 3 mois', id:'p29'}
    ],
    pro: [
      {icon:'p-pro', name:'Distributeur d\'Eau Froide et Chaude VIRTUS', note:'861,00 € — pensé pour un usage intensif', id:'p16'},
      {icon:'p-uv', name:'Filtre UV pour Fontaine à Eau', note:'107,40 € — recommandé pour une eau très sollicitée', id:'p31'}
    ]
  };

  /* ---------- Event delegation ---------- */
  document.addEventListener('click', function(e){
    /* These two side effects are independent of the routing mechanism below (History API
       here, native hash navigation in the Artifact-preview variant), so they run
       unconditionally before anything else. */
    if (e.target.closest('.search-result')) closeSearch();
    var scrollLink = e.target.closest('[data-scroll-to]');
    if (scrollLink){ pendingScrollTarget = scrollLink.getAttribute('data-scroll-to'); }

    /* Internal navigation: intercept clicks on same-origin links that start with "/" and
       drive them through the History API instead of a full page load, so the SPA keeps
       working exactly as before while every route now has a real, crawlable URL. */
    var navLink = e.target.closest('a[href]');
    if (navLink){
      var href = navLink.getAttribute('href');
      var isModified = e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey;
      if (href && href.charAt(0) === '/' && navLink.target !== '_blank' && !isModified){
        e.preventDefault();
        if (location.pathname !== href) history.pushState(null, '', href);
        render();
        return;
      }
    }

    var addBtn = e.target.closest('[data-add]');
    if (addBtn){
      var qty = 1;
      if (addBtn.id === 'pdAddBtn'){
        var qtyEl = document.getElementById('pdQty');
        qty = qtyEl ? (parseInt(qtyEl.textContent,10) || 1) : 1;
      }
      var pid = addBtn.getAttribute('data-add');
      addToCart(pid, qty);
      var pobj = findProduct(pid);
      showToast('« ' + (pobj?pobj.name:'Produit') + ' » ajouté au panier');
      return;
    }
    var bundleBtn = e.target.closest('[data-add-bundle]');
    if (bundleBtn){
      var ids2 = bundleBtn.getAttribute('data-add-bundle').split(',');
      ids2.forEach(function(id){ addToCart(id, 1); });
      showToast('2 articles ajoutés au panier');
      return;
    }

    var scrollLink = e.target.closest('[data-scroll-to]');
    if (scrollLink){ pendingScrollTarget = scrollLink.getAttribute('data-scroll-to'); }

    var qtyBtn = e.target.closest('[data-qty]');
    if (qtyBtn){ changeQty(qtyBtn.getAttribute('data-id'), parseInt(qtyBtn.getAttribute('data-qty'),10)); return; }

    var rmBtn = e.target.closest('[data-remove]');
    if (rmBtn){ removeItem(rmBtn.getAttribute('data-remove')); return; }

    var pdQtyBtn = e.target.closest('[data-pdqty]');
    if (pdQtyBtn){
      var el = document.getElementById('pdQty');
      if (el){ var v = Math.max(1, (parseInt(el.textContent,10)||1) + parseInt(pdQtyBtn.getAttribute('data-pdqty'),10)); el.textContent = v; }
      return;
    }

    var filterBtn = e.target.closest('[data-filter]');
    if (filterBtn){
      var group = filterBtn.closest('.filter-chips');
      if (group){ group.querySelectorAll('.btn').forEach(function(b){ b.classList.remove('active'); }); }
      filterBtn.classList.add('active');
      refreshCategoryGrid();
      return;
    }

    var finderBtn = e.target.closest('.finder-choice');
    if (finderBtn){
      var container = finderBtn.closest('.finder');
      container.querySelectorAll('.finder-choice').forEach(function(b){ b.classList.remove('active'); });
      finderBtn.classList.add('active');
      var profile = finderBtn.getAttribute('data-profile');
      var recs = RECS[profile] || [];
      var resultEl = container.querySelector('.finder-result');
      var html = '<p class="eyebrow" style="margin-bottom:2px;">Notre recommandation</p>';
      recs.forEach(function(r){
        var rp = findProduct(r.id);
        html += '<a class="rec" href="/produit/'+r.id+'"><span class="icon-wrap"><svg width="26" height="26"><use href="#'+r.icon+'"/></svg>'+(rp?P.photoHtml(rp):'')+'</span><span><strong>'+r.name+'</strong><span>'+r.note+'</span></span></a>';
      });
      resultEl.innerHTML = html;
      return;
    }

    var faqQ = e.target.closest('.faq-q');
    if (faqQ){ faqQ.closest('.faq-item').classList.toggle('open'); return; }

    var accTab = e.target.closest('[data-tab]');
    if (accTab){ renderAccount(accTab.getAttribute('data-tab')); return; }

    if (e.target.id === 'cancelSubBtn'){ clearSub(); renderAccount('subscription'); return; }

    if (e.target.id === 'promoBtn'){
      var input = document.getElementById('promoInput');
      var msg = document.getElementById('promoMsg');
      var code = (input.value || '').trim().toUpperCase();
      if (code === 'AQUA10'){ promoApplied = true; renderCartPage(); }
      else { msg.textContent = 'Code promo invalide.'; }
      return;
    }

    if (e.target.id === 'cartBtn' || e.target.closest('#cartBtn')){ openCart(); return; }
    if (e.target.id === 'cartClose' || e.target.closest('#cartClose')){ closeCart(); return; }
    if (e.target.id === 'menuBtn' || e.target.closest('#menuBtn')){ openMenu(); return; }
    if (e.target.id === 'menuClose' || e.target.closest('#menuClose')){ closeMenu(); return; }
    if (e.target.id === 'overlay'){ closeCart(); closeMenu(); return; }
    if (e.target.closest('.mobile-nav-panel a')){ closeMenu(); return; }

    if (e.target.id === 'searchBtn' || e.target.closest('#searchBtn')){ openSearch(); return; }
    if (e.target.id === 'searchClose' || e.target.closest('#searchClose')){ closeSearch(); return; }
    if (e.target.id === 'searchModal'){ closeSearch(); return; }

    if (e.target.id === 'chatFab' || e.target.closest('#chatFab')){
      if (document.getElementById('chatPanel').classList.contains('open')) closeChat(); else openChat();
      return;
    }
    if (e.target.id === 'chatClose' || e.target.closest('#chatClose')){ closeChat(); return; }
    var chatChip = e.target.closest('.chat-chip');
    if (chatChip){ handleChatQuestion(chatChip.textContent); return; }

    if (e.target.id === 'cookieAccept'){ setCookieConsent('accepted'); return; }
    if (e.target.id === 'cookieDecline'){ setCookieConsent('declined'); return; }
  });

  function recomputeCheckoutTotal(){
    var form = document.getElementById('checkoutForm');
    if (!form) return;
    var shipModeEl = form.querySelector('input[name="shipMode"]:checked');
    var shipMode = shipModeEl ? shipModeEl.value : 'standard';
    var subtotal = cartSubtotal();
    var discount = promoApplied ? subtotal*0.10 : 0;
    var afterDiscount = subtotal - discount;
    var shipping = shipMode === 'express' ? EXPRESS_SHIPPING_FEE : (afterDiscount >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_FEE);
    var bumpChecked = document.getElementById('bumpCheckbox') && document.getElementById('bumpCheckbox').checked;
    var bumpRow = document.getElementById('bumpRow');
    if (bumpRow) bumpRow.hidden = !bumpChecked;
    var total = afterDiscount + shipping + (bumpChecked ? BUMP_PRICE : 0);
    var shipVal = document.getElementById('checkoutShipVal');
    var totalVal = document.getElementById('checkoutTotalVal');
    if (shipVal) shipVal.textContent = shipping === 0 ? 'Offerte' : (shipping.toLocaleString('fr-FR',{minimumFractionDigits:2}) + ' €');
    if (totalVal) totalVal.innerHTML = P.money(total);
  }

  document.addEventListener('change', function(e){
    if (e.target.id === 'sortSelect'){ refreshCategoryGrid(); return; }
    if (e.target.name === 'shipMode' || e.target.id === 'bumpCheckbox'){ recomputeCheckoutTotal(); return; }
  });

  document.addEventListener('input', function(e){
    if (e.target.id === 'searchInput'){ renderSearchResults(e.target.value); return; }
  });

  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape' && document.getElementById('searchModal').classList.contains('open')){ closeSearch(); return; }
    if (e.key === 'Escape' && document.getElementById('chatPanel').classList.contains('open')){ closeChat(); return; }
    if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA'){
      var modal = document.getElementById('searchModal');
      if (!modal.classList.contains('open')){ e.preventDefault(); openSearch(); }
    }
  });

  document.addEventListener('submit', function(e){
    if (e.target.id === 'chatForm'){
      e.preventDefault();
      var chatInput = document.getElementById('chatInput');
      handleChatQuestion(chatInput.value);
      chatInput.value = '';
      return;
    }
    if (e.target.id === 'chatLeadForm'){
      e.preventDefault();
      var emailEl = document.getElementById('chatLeadEmail');
      var idx = parseInt(e.target.getAttribute('data-idx'), 10);
      submitChatLead(idx, emailEl.value.trim());
      return;
    }
    if (e.target.id === 'newsForm'){
      e.preventDefault();
      var newsEmailEl = document.getElementById('newsEmail');
      if (newsEmailEl && newsEmailEl.value.trim()) sendLeadToServer(newsEmailEl.value.trim(), '', 'newsletter');
      var msg = document.getElementById('newsMsg');
      msg.hidden = false;
      msg.textContent = 'Merci ! Voici votre code : AQUA10 (démonstration)';
      e.target.reset();
      return;
    }
    if (e.target.id === 'contactForm'){
      e.preventDefault();
      var form = e.target;
      var ok = true;
      ['cName','cEmail','cMsg'].forEach(function(id){
        var el = document.getElementById(id);
        var fieldEl = el.closest('.field');
        var errEl = fieldEl.querySelector('.field-error');
        if (!el.value.trim()){ ok = false; fieldEl.classList.add('has-error'); errEl.textContent = 'Champ requis'; }
        else { fieldEl.classList.remove('has-error'); errEl.textContent = ''; }
      });
      if (!ok) return;
      document.getElementById('contactConfirm').hidden = false;
      form.reset();
      return;
    }
    if (e.target.id === 'checkoutForm'){ e.preventDefault(); handleCheckoutSubmit(e.target); return; }
    if (e.target.id === 'subForm'){
      e.preventDefault();
      saveSub({ productId: document.getElementById('subProduct').value, frequency: document.getElementById('subFreq').value });
      renderAccount('subscription');
      return;
    }
    if (e.target.id === 'profileForm'){
      e.preventDefault();
      saveProfile({ name: document.getElementById('pfName').value, email: document.getElementById('pfEmail').value, address: document.getElementById('pfAddress').value });
      document.getElementById('profileMsg').textContent = 'Informations enregistrées.';
      return;
    }
  });

  /* ---------- Init ---------- */
  window.addEventListener('popstate', render);
  document.addEventListener('DOMContentLoaded', function(){
    renderCartBadge();
    renderDrawer();
    initCookieBanner();
    render();
  });
})();
