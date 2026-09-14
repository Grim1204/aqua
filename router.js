/* AquaSource — gabarits de rendu des pages (fonctions pures : data -> HTML) */
window.AQUA_PAGES = (function(){
  var D = window.AQUA_DATA;

  function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;'); }
  function money(n){ return n.toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2}) + '&nbsp;€'; }
  function starsHtml(){
    var s = '';
    for (var i=0;i<5;i++){ s += '<svg class="icon"><use href="#i-star"/></svg>'; }
    return s;
  }
  function photoHtml(p){
    if (!p || !p.image) return '';
    return '<img class="prod-photo" src="'+esc(p.image)+'" alt="'+esc(p.name)+'" loading="lazy" decoding="async" onerror="this.remove()">';
  }
  function badgeHtml(p){
    if (!p.badge) return '';
    var cls = p.badge === 'Promo' ? 'badge-promo' : (p.badge === 'Best-seller' ? 'badge-best' : 'badge-new');
    return '<span class="badge '+cls+'">'+p.badge+'</span>';
  }
  function breadcrumb(items){
    var html = '<nav class="wrap breadcrumb" aria-label="Fil d\'ariane"><a href="/">Accueil</a>';
    items.forEach(function(it, i){
      html += '<span class="sep">/</span>';
      if (it.href && i < items.length-1){ html += '<a href="'+it.href+'">'+it.label+'</a>'; }
      else { html += '<span class="current">'+it.label+'</span>'; }
    });
    html += '</nav>';
    return html;
  }

  function productCard(p){
    return '' +
      '<article class="card" data-id="'+p.id+'">' +
        '<a class="card-media" href="/produit/'+p.id+'">' +
          badgeHtml(p) +
          '<svg width="150" height="150"><use href="#'+p.icon+'"/></svg>' + photoHtml(p) +
        '</a>' +
        '<div class="card-body">' +
          '<h3><a href="/produit/'+p.id+'">'+p.name+'</a></h3>' +
          '<p class="spec">'+p.specLine+'</p>' +
          '<div class="rating"><span class="stars">'+starsHtml()+'</span> '+p.rating.toFixed(1)+' ('+p.reviews+' avis)</div>' +
          '<div class="price-row"><span class="price-now">'+money(p.price)+'</span>' + (p.oldPrice ? '<span class="price-old">'+money(p.oldPrice)+'</span>' : '') + '</div>' +
        '</div>' +
        (p.subscription ? '<p class="sub-note"><svg class="icon" style="width:.9em;height:.9em;"><use href="#i-refresh"/></svg> Disponible en abonnement -15%</p>' : '') +
        '<div class="card-foot"><button class="add-btn" data-add="'+p.id+'"><svg class="icon"><use href="#i-cart"/></svg> Ajouter</button></div>' +
      '</article>';
  }
  function bundleHtml(main, addon){
    var total = main.price + addon.price;
    return '<div class="bundle-box">' +
      '<p class="eyebrow">Fréquemment achetés ensemble</p>' +
      '<div class="bundle-items">' +
        '<div class="bundle-item"><span class="icon-wrap"><svg width="24" height="24"><use href="#'+main.icon+'"/></svg>'+photoHtml(main)+'</span><div><strong>'+main.name+'</strong><span>'+money(main.price)+'</span></div></div>' +
        '<span class="bundle-plus">+</span>' +
        '<div class="bundle-item"><span class="icon-wrap"><svg width="24" height="24"><use href="#'+addon.icon+'"/></svg>'+photoHtml(addon)+'</span><div><strong>'+addon.name+'</strong><span>'+money(addon.price)+'</span></div></div>' +
      '</div>' +
      '<div class="bundle-foot"><span class="bundle-total">Total : <strong>'+money(total)+'</strong></span>' +
      '<button class="btn btn-primary btn-sm" data-add-bundle="'+main.id+','+addon.id+'"><svg class="icon"><use href="#i-cart"/></svg> Ajouter les 2 au panier</button></div>' +
    '</div>';
  }
  function productGrid(products){
    if (!products.length){
      return '<div class="empty-state"><span class="icon-wrap"><svg class="icon" style="width:1.6em;height:1.6em;"><use href="#i-filter"/></svg></span><p>Aucun produit ne correspond à ce filtre.</p></div>';
    }
    return '<div class="prod-grid" id="gridProducts">' + products.map(productCard).join('') + '</div>';
  }

  function trustStrip(){
    return '<section class="trust-strip" style="padding-block:0;"><div class="wrap trust-grid">' +
      '<div class="trust-item"><svg class="icon"><use href="#i-truck"/></svg><span><strong>Livraison 24-48h</strong><span>Dès 49&nbsp;€ d\'achat</span></span></div>' +
      '<div class="trust-item"><svg class="icon"><use href="#i-shield"/></svg><span><strong>Satisfait ou remboursé</strong><span>30 jours pour changer d\'avis</span></span></div>' +
      '<div class="trust-item"><svg class="icon"><use href="#i-refresh"/></svg><span><strong>Paiement en 3x ou 4x</strong><span>Sans frais, dès 90&nbsp;€</span></span></div>' +
      '<div class="trust-item"><svg class="icon"><use href="#i-headset"/></svg><span><strong>Service client dédié</strong><span>Lun-sam, 8h-18h30</span></span></div>' +
    '</div></section>';
  }

  function testimonialCard(t){
    var p = D.PRODUCTS.filter(function(x){return x.id===t.product;})[0];
    return '<div class="test-card">' +
      '<span class="stars">'+starsHtml()+'</span>' +
      '<p class="quote">« '+t.quote+' »</p>' +
      '<div class="test-foot"><span>'+t.name+' — '+t.loc+'</span><span class="verified"><svg class="icon"><use href="#i-check"/></svg> Achat vérifié'+(p?' · '+p.name:'')+'</span></div>' +
    '</div>';
  }

  function seoBlockHome(){
    return '<section class="alt"><div class="wrap"><div class="prose" style="max-width:800px;">' +
      '<p class="eyebrow">Le guide AquaSource</p>' +
      '<h2 style="font-size:1.6rem;">Bien choisir sa fontaine à eau et ses cartouches de filtration</h2>' +
      '<p>Une fontaine à eau change durablement les habitudes d\'un foyer ou d\'un bureau : moins de bouteilles à porter et à stocker, une eau meilleure au goût, et un accès à volonté à l\'eau chaude comme à l\'eau fraîche. Encore faut-il choisir le bon modèle et la bonne filtration selon son usage réel — voici les repères que nous donnons à chaque client avant un premier achat.</p>' +
      '<h3 style="font-size:1.05rem;">Fontaine à bonbonne ou sur réseau : quel modèle pour vous ?</h3>' +
      '<p>La fontaine à bonbonne reste la solution la plus simple à mettre en place : aucun raccordement, une installation en quelques minutes, un investissement de départ limité. Elle convient parfaitement à un usage occasionnel, une location ou une seconde fontaine dans un bureau. La fontaine sur réseau, raccordée à votre arrivée d\'eau, demande un peu plus de préparation mais supprime totalement la manutention des bonbonnes : elle devient rentable dès que la consommation dépasse deux à trois bonbonnes par mois, et s\'impose naturellement dans les environnements à forte fréquentation.</p>' +
      '<h3 style="font-size:1.05rem;">Pourquoi la qualité de filtration fait toute la différence</h3>' +
      '<p>Une fontaine performante ne suffit pas si la cartouche installée ne filtre pas correctement. Le charbon actif reste la base : il retient le chlore et les composés responsables du goût de l\'eau du robinet. Dans les zones à eau calcaire, une cartouche anti-tartre protège en plus le circuit de la fontaine, tandis qu\'un traitement UV renforce l\'action anti-bactérienne. Toutes nos cartouches sont testées en laboratoire indépendant avant d\'être ajoutées au catalogue, et disponibles en abonnement pour ne jamais être prises au dépourvu.</p>' +
      '<h3 style="font-size:1.05rem;">Fontaine à eau et environnement : un geste simple au quotidien</h3>' +
      '<p>Remplacer des packs de bouteilles par une fontaine filtrée réduit sensiblement la consommation de plastique à usage unique d\'un foyer ou d\'un bureau. C\'est un geste simple, sans changement d\'habitude majeur, qui s\'accompagne chez AquaSource de cartouches recyclables et de matériaux sans BPA sur l\'ensemble de la gamme. Pour aller plus loin, nos guides pratiques détaillent l\'entretien et la fréquence de changement des cartouches afin de prolonger la durée de vie de chaque fontaine.</p>' +
    '</div></div></section>';
  }

  function newsletterBlock(){
    return '<section class="wrap"><div class="newsletter">' +
      '<div><h2>-10% sur votre première commande</h2><p>Inscrivez-vous pour recevoir nos conseils filtration et nos offres en avant-première.</p>' +
      '<p class="newsletter-msg" id="newsMsg" hidden></p></div>' +
      '<form class="newsletter-form" id="newsForm">' +
        '<label for="newsEmail" style="position:absolute;width:1px;height:1px;overflow:hidden;">Adresse e-mail</label>' +
        '<input id="newsEmail" type="email" placeholder="Votre adresse e-mail" required>' +
        '<button class="btn btn-primary" type="submit">Je m\'inscris</button>' +
      '</form>' +
    '</div></section>';
  }

  /* ---------------- HOME ---------------- */
  function pageHome(){
    var bestsellers = D.PRODUCTS.filter(function(p){ return ['p1','p8','p20','p29','p31','p33'].indexOf(p.id) !== -1; });
    return '' +
    '<section class="hero" style="padding:0;">' +
      '<div class="wrap hero-inner">' +
        '<div>' +
          '<p class="eyebrow" style="color:var(--citrus);">Fontaines &amp; filtration domestique et pro</p>' +
          '<h1>Fontaines à eau et cartouches filtrantes : une eau <em>pure et fraîche</em>, sans effort au quotidien.</h1>' +
          '<p class="lead">AquaSource sélectionne des fontaines à eau bonbonne et sur réseau, associées à des cartouches de filtration testées, pour la maison comme pour le bureau.</p>' +
          '<div class="hero-ctas"><a class="btn btn-primary" href="/fontaines-bonbonne">Découvrir les fontaines</a><a class="btn btn-ghost" href="/cartouches-filtres">Trouver mes cartouches</a></div>' +
          '<div class="hero-chips">' +
            '<span class="hero-chip"><svg class="icon"><use href="#i-leaf"/></svg> Moins de bouteilles plastique</span>' +
            '<span class="hero-chip"><svg class="icon"><use href="#i-filter"/></svg> Filtration 0,5&nbsp;µm testée</span>' +
            '<span class="hero-chip"><svg class="icon"><use href="#i-shield"/></svg> Garantie 2 ans</span>' +
          '</div>' +
        '</div>' +
        '<div class="hero-art"><svg viewBox="0 0 320 320" width="100%" style="max-width:360px;"><circle cx="160" cy="160" r="150" fill="rgba(255,255,255,.06)"/><circle cx="160" cy="160" r="112" fill="rgba(255,255,255,.08)"/><use href="#p-bonbonne" x="70" y="70" width="180" height="180"/></svg></div>' +
      '</div>' +
      '<div class="wave-divider"><svg viewBox="0 0 1200 80" preserveAspectRatio="none"><path d="M0,40 C 200,90 400,0 600,30 C 800,60 1000,10 1200,40 L1200,80 L0,80 Z" fill="var(--mist)"/></svg></div>' +
    '</section>' +

    '<section class="wrap">' +
      '<p class="eyebrow">Notre catalogue</p>' +
      '<h2 style="margin-top:6px;">Tout pour une eau maîtrisée, du réservoir au robinet</h2>' +
      '<div class="cat-grid">' +
        Object.keys(D.CATEGORIES).map(function(key){
          var c = D.CATEGORIES[key];
          return '<a class="cat-tile" href="/'+c.slug+'"><span class="icon-wrap"><svg class="icon"><use href="#'+c.icon+'"/></svg></span><h3>'+c.title+'</h3><p>'+c.intro.split('.')[0]+'.</p></a>';
        }).join('') +
      '</div>' +
    '</section>' +

    trustStrip() +

    '<section class="wrap">' +
      '<div class="section-head"><div><p class="eyebrow">Meilleures ventes</p><h2>Nos incontournables</h2><p>La sélection la plus commandée, tous rayons confondus.</p></div>' +
      '<a class="btn btn-outline btn-sm" href="/professionnels">Voir la gamme professionnels</a></div>' +
      productGrid(bestsellers) +
    '</section>' +

    '<section class="wrap" id="finderHome">' +
      '<p class="eyebrow">Besoin d\'un conseil ?</p>' +
      '<h2 style="margin-top:6px;margin-bottom:26px;">Quelle fontaine correspond à vos besoins ?</h2>' +
      '<div class="finder">' +
        '<div><h3 style="font-size:1.15rem;">Dites-nous où elle sera installée</h3>' +
        '<p style="color:var(--ink-soft);font-size:.9rem;margin-top:6px;">Nous vous recommandons un modèle et la cartouche adaptée.</p>' +
        '<div class="finder-choices">' +
          '<button class="finder-choice" data-profile="particulier"><span class="icon-wrap"><svg class="icon"><use href="#i-droplet"/></svg></span><span><strong>Chez moi</strong><span>Cuisine, salon — usage familial</span></span></button>' +
          '<button class="finder-choice" data-profile="pro"><span class="icon-wrap"><svg class="icon"><use href="#i-building"/></svg></span><span><strong>Au bureau</strong><span>Open-space, salle d\'attente — usage intensif</span></span></button>' +
        '</div></div>' +
        '<div class="finder-result" id="finderResult"><p class="finder-empty">Sélectionnez un profil pour voir notre recommandation.</p></div>' +
      '</div>' +
    '</section>' +

    '<section class="alt"><div class="wrap">' +
      '<p class="eyebrow">Pourquoi AquaSource</p><h2 style="margin-top:6px;margin-bottom:30px;">Une eau de qualité, pensée pour durer</h2>' +
      '<div class="why-grid">' +
        '<div class="why-item"><span class="icon-wrap"><svg class="icon"><use href="#i-leaf"/></svg></span><h3>Moins de plastique</h3><p>Une fontaine remplace en moyenne plusieurs centaines de bouteilles par an.</p></div>' +
        '<div class="why-item"><span class="icon-wrap"><svg class="icon"><use href="#i-filter"/></svg></span><h3>Filtration testée</h3><p>Cartouches contrôlées en laboratoire indépendant, matériaux sans BPA.</p></div>' +
        '<div class="why-item"><span class="icon-wrap"><svg class="icon"><use href="#i-refresh"/></svg></span><h3>Abonnement cartouches</h3><p>Renouvellement automatique tous les 3 ou 6 mois, sans y penser.</p></div>' +
        '<div class="why-item"><span class="icon-wrap"><svg class="icon"><use href="#i-headset"/></svg></span><h3>SAV réactif</h3><p>Une question, une pièce à remplacer : réponse sous 24h ouvrées.</p></div>' +
      '</div>' +
    '</div></section>' +

    '<section class="wrap"><p class="eyebrow">Ils nous font confiance</p><h2 style="margin-top:6px;margin-bottom:28px;">Avis vérifiés de nos clients</h2>' +
      '<div class="test-grid">' + D.TESTIMONIALS.slice(0,3).map(testimonialCard).join('') + '</div>' +
    '</section>' +

    '<section class="alt"><div class="wrap"><div class="cert-strip">' +
      '<span class="cert-chip"><svg class="icon"><use href="#i-shield"/></svg> Matériaux sans BPA</span>' +
      '<span class="cert-chip"><svg class="icon"><use href="#i-filter"/></svg> Filtration testée en laboratoire</span>' +
      '<span class="cert-chip"><svg class="icon"><use href="#i-check"/></svg> Conforme aux normes CE</span>' +
      '<span class="cert-chip"><svg class="icon"><use href="#i-leaf"/></svg> Cartouches recyclables</span>' +
      '<span class="cert-chip"><svg class="icon"><use href="#i-refresh"/></svg> Garantie constructeur 2 ans</span>' +
    '</div></div></section>' +

    '<section class="wrap"><p class="eyebrow">Le blog AquaSource</p><h2 style="margin-top:6px;margin-bottom:28px;">Conseils &amp; entretien</h2>' +
      '<div class="blog-grid">' + sortedBlog().slice(0,3).map(blogCard).join('') + '</div>' +
    '</section>' +

    seoBlockHome() +

    newsletterBlock();
  }

  /* ---------------- CATEGORY ---------------- */
  function pageCategory(key){
    var c = D.CATEGORIES[key];
    if (!c) return pageNotFound();
    var products = D.PRODUCTS.filter(function(p){ return p.category === key; });
    return '' +
      '<div class="page-head"><div class="wrap"><p class="eyebrow">Catalogue</p><h1>'+c.title+'</h1><p>'+c.intro+'</p></div></div>' +
      breadcrumb([{label:c.title}]) +
      '<section class="wrap">' +
        '<div class="filter-bar">' +
          '<div class="filter-chips">' +
            '<button class="btn btn-outline btn-sm active" data-filter="all">Tous ('+products.length+')</button>' +
            '<button class="btn btn-outline btn-sm" data-filter="Promo">En promotion</button>' +
            '<button class="btn btn-outline btn-sm" data-filter="Best-seller">Best-sellers</button>' +
          '</div>' +
          '<select class="sort-select" id="sortSelect">' +
            '<option value="pop">Trier : popularité</option>' +
            '<option value="asc">Prix croissant</option>' +
            '<option value="desc">Prix décroissant</option>' +
            '<option value="rating">Meilleures notes</option>' +
          '</select>' +
        '</div>' +
        '<div id="categoryGridWrap" data-category="'+key+'">' + productGrid(products) + '</div>' +
      '</section>' +
      (key === 'cartouche' ? '<section class="alt"><div class="wrap"><div class="finder" style="grid-template-columns:1fr;"><div><p class="eyebrow">Pas sûr de la compatibilité ?</p><h3 style="margin-top:8px;font-size:1.2rem;">Contactez notre service client avec le modèle de votre fontaine, nous confirmons la référence adaptée sous 24h.</h3><div style="margin-top:18px;"><a class="btn btn-primary" href="/contact">Nous écrire</a></div></div></div></div></section>' : '') +
      ((key === 'bonbonne' || key === 'reseau') ? '<section class="wrap"><div class="finder-cta"><span class="icon-wrap"><svg class="icon"><use href="#i-droplet"/></svg></span><div><strong>Hésitant entre plusieurs modèles ?</strong><span>Répondez à 2 questions, nous vous recommandons la fontaine adaptée à votre usage — en 10 secondes.</span></div><a class="btn btn-outline btn-sm" href="/" data-scroll-to="finderHome">Faire le test</a></div></section>' : '') +
      (c.seoIntro || c.guide ? '<section class="wrap"><div class="prose">' +
        (c.seoIntro ? '<p>'+c.seoIntro+'</p>' : '') +
        (c.guide ? c.guide.map(function(s){ return '<h2 style="font-size:1.15rem;">'+s.h+'</h2>' + s.p.map(function(t){return '<p>'+t+'</p>';}).join(''); }).join('') : '') +
      '</div></section>' : '') +
      (c.faq && c.faq.length ? '<section class="alt"><div class="wrap"><div class="section-head"><div><p class="eyebrow">Questions fréquentes</p><h2>'+c.title+' : ce qu\'il faut savoir</h2></div></div><div class="faq-list">' +
        c.faq.map(function(f,i){ return '<div class="faq-item" data-faq="cat-'+i+'"><button class="faq-q"><span>'+f.q+'</span><svg class="icon"><use href="#i-chevron"/></svg></button><div class="faq-a"><div class="faq-a-inner">'+f.a+'</div></div></div>'; }).join('') +
      '</div></div></section>' : '');
  }

  /* ---------------- PRODUCT ---------------- */
  function pageProduct(id){
    var p = D.PRODUCTS.filter(function(x){return x.id===id;})[0];
    if (!p) return pageNotFound();
    var c = D.CATEGORIES[p.category];
    var related = D.PRODUCTS.filter(function(x){ return x.category===p.category && x.id!==p.id; }).slice(0,3);
    var bundleAddon = p.bundleWith ? D.PRODUCTS.filter(function(x){return x.id===p.bundleWith;})[0] : null;
    return '' +
      breadcrumb([{label:c.title, href:'/'+c.slug}, {label:p.name}]) +
      '<section class="wrap">' +
        '<div class="product-detail">' +
          '<div class="product-media">' + badgeHtml(p) + '<svg width="70%" height="70%" viewBox="0 0 120 120"><use href="#'+p.icon+'"/></svg>' + photoHtml(p) + '</div>' +
          '<div class="product-info">' +
            '<p class="eyebrow">'+c.title+(p.brand?' · '+p.brand:'')+'</p>' +
            '<h1>'+p.name+'</h1>' +
            '<div class="rating" style="margin-top:10px;"><span class="stars">'+starsHtml()+'</span> '+p.rating.toFixed(1)+' · '+p.reviews+' avis</div>' +
            '<div class="product-price-row"><span class="price-now">'+money(p.price)+'</span>' + (p.oldPrice?'<span class="price-old">'+money(p.oldPrice)+'</span>':'') + '</div>' +
            '<p class="lead">'+p.shortDesc+'</p>' +
            (p.subscription ? '<p class="sub-note" style="padding:0;margin-top:10px;"><svg class="icon" style="width:.9em;height:.9em;"><use href="#i-refresh"/></svg> Disponible en abonnement (-15%, tous les 3 ou 6 mois)</p>' : '') +
            '<div class="qty-selector"><span style="font-size:.85rem;font-weight:600;color:var(--ink-soft);">Quantité</span>' +
              '<div class="qty-box"><button type="button" data-pdqty="-1" aria-label="Diminuer"><svg class="icon"><use href="#i-minus"/></svg></button><span id="pdQty">1</span><button type="button" data-pdqty="1" aria-label="Augmenter"><svg class="icon"><use href="#i-plus"/></svg></button></div>' +
            '</div>' +
            '<div class="detail-actions">' +
              '<button class="btn btn-primary" id="pdAddBtn" data-add="'+p.id+'"><svg class="icon"><use href="#i-cart"/></svg> Ajouter au panier</button>' +
              '<a class="btn btn-outline" href="/contact">Une question ?</a>' +
            '</div>' +
            '<table class="spec-table"><tbody>' + p.specs.map(function(s){ return '<tr><td>'+s[0]+'</td><td>'+s[1]+'</td></tr>'; }).join('') + '</tbody></table>' +
            '<div class="product-desc">' + p.longDesc.map(function(t){return '<p>'+t+'</p>';}).join('') + '</div>' +
            '<div class="trust-mini">' +
              '<span><svg class="icon"><use href="#i-truck"/></svg> Expédié sous 24h</span>' +
              '<span><svg class="icon"><use href="#i-shield"/></svg> Garantie 2 ans</span>' +
              '<span><svg class="icon"><use href="#i-refresh"/></svg> Retour gratuit 30 jours</span>' +
              '<span><svg class="icon"><use href="#i-lock"/></svg> Paiement sécurisé</span>' +
            '</div>' +
            (bundleAddon ? bundleHtml(p, bundleAddon) : '') +
          '</div>' +
        '</div>' +
      '</section>' +
      (related.length ? '<section class="alt"><div class="wrap"><div class="section-head"><div><p class="eyebrow">Vous aimerez aussi</p><h2>Autres produits de la gamme</h2></div></div><div class="related-grid">'+productGrid(related)+'</div></div></section>' : '') +
      '<div id="recentlyViewedWrap"></div>';
  }

  /* ---------------- PROFESSIONNELS ---------------- */
  function pagePro(){
    return '' +
      '<section class="wrap" style="padding-bottom:0;">' +
        '<div class="pro-hero">' +
          '<div><p class="eyebrow" style="color:var(--citrus);">Offres entreprises</p><h1>Une fontaine à eau pour chaque bureau, chaque budget.</h1><p>Des tarifs dégressifs dès 3 fontaines, une installation accompagnée et un contrat de maintenance sur mesure pour vos locaux.</p>' +
          '<div class="hero-ctas" style="margin-top:24px;"><a class="btn btn-primary" href="/contact">Demander un devis</a><a class="btn btn-ghost" href="/fontaines-reseau">Voir les modèles pro</a></div></div>' +
          '<svg viewBox="0 0 320 320" width="100%" style="max-width:260px;justify-self:center;"><circle cx="160" cy="160" r="140" fill="rgba(255,255,255,.08)"/><use href="#p-pro" x="70" y="70" width="180" height="180"/></svg>' +
        '</div>' +
      '</section>' +
      '<section class="wrap">' +
        '<div class="section-head"><div><p class="eyebrow">Tarification</p><h2>Une grille dégressive selon vos besoins</h2></div></div>' +
        '<div class="pricing-grid">' +
          '<div class="pricing-card"><span class="tag">1-2 fontaines</span><span class="amount">Tarif catalogue</span><ul>' +
            '<li><svg class="icon"><use href="#i-check"/></svg> Livraison 24-48h</li>' +
            '<li><svg class="icon"><use href="#i-check"/></svg> Garantie 2 ans</li>' +
            '<li><svg class="icon"><use href="#i-check"/></svg> Facture avec TVA</li>' +
          '</ul><a class="btn btn-outline btn-block" href="/fontaines-reseau">Voir les modèles</a></div>' +
          '<div class="pricing-card highlight"><span class="tag">3-9 fontaines</span><span class="amount">-12% sur le catalogue</span><ul>' +
            '<li><svg class="icon"><use href="#i-check"/></svg> Installation programmée sur site</li>' +
            '<li><svg class="icon"><use href="#i-check"/></svg> Interlocuteur commercial dédié</li>' +
            '<li><svg class="icon"><use href="#i-check"/></svg> Paiement à 30 jours possible</li>' +
          '</ul><a class="btn btn-primary btn-block" href="/contact">Demander un devis</a></div>' +
          '<div class="pricing-card"><span class="tag">10 fontaines et +</span><span class="amount">Tarif sur devis</span><ul>' +
            '<li><svg class="icon"><use href="#i-check"/></svg> Contrat de maintenance inclus</li>' +
            '<li><svg class="icon"><use href="#i-check"/></svg> Remplacement cartouches programmé</li>' +
            '<li><svg class="icon"><use href="#i-check"/></svg> Numéro de suivi prioritaire</li>' +
          '</ul><a class="btn btn-outline btn-block" href="/contact">Nous contacter</a></div>' +
        '</div>' +
      '</section>' +
      trustStrip() +
      '<section class="wrap"><div class="section-head"><div><p class="eyebrow">Recommandé pour les bureaux</p><h2>Nos modèles à forte capacité</h2></div></div>' +
        productGrid(D.PRODUCTS.filter(function(p){return p.id==='p20'||p.id==='p16'||p.id==='p25';})) +
      '</section>';
  }

  /* ---------------- BLOG ---------------- */
  var FR_MONTHS = {janvier:0,février:1,fevrier:1,mars:2,avril:3,mai:4,juin:5,juillet:6,août:7,aout:7,septembre:8,octobre:9,novembre:10,décembre:11,decembre:11};
  function blogDateKey(dateStr){
    var parts = String(dateStr).toLowerCase().split(' ');
    var day = parseInt(parts[0],10) || 1;
    var month = FR_MONTHS.hasOwnProperty(parts[1]) ? FR_MONTHS[parts[1]] : 0;
    var year = parseInt(parts[2],10) || 2026;
    return year*372 + month*31 + day;
  }
  function sortedBlog(){
    return D.BLOG.slice().sort(function(a,b){ return blogDateKey(b.date) - blogDateKey(a.date); });
  }
  function blogIconSvg(icon, size){
    var isLine = icon.indexOf('i-') === 0;
    return isLine ?
      '<svg width="'+size+'" height="'+size+'" class="icon" style="width:'+size+'px;height:'+size+'px;stroke-width:1.3;"><use href="#'+icon+'"/></svg>' :
      '<svg width="'+size+'" height="'+size+'"><use href="#'+icon+'"/></svg>';
  }
  function blogCard(b){
    return '<a class="blog-card" href="/conseils/'+b.slug+'">' +
      '<div class="blog-media">'+blogIconSvg(b.icon,70)+'</div>' +
      '<div class="blog-body"><p class="eyebrow">'+b.eyebrow+'</p><h3>'+b.title+'</h3><p>'+b.excerpt+'</p>' +
      '<div class="blog-meta"><span>'+b.date+'</span><span>· '+b.readTime+' de lecture</span></div>' +
      '<span class="blog-link">Lire l\'article <svg class="icon" style="width:.9em;height:.9em;"><use href="#i-chevron"/></svg></span></div>' +
    '</a>';
  }
  function pageBlogList(){
    return '' +
      '<div class="page-head"><div class="wrap"><p class="eyebrow">Ressources</p><h1>Conseils &amp; entretien</h1><p>'+D.BLOG.length+' guides pratiques, rédigés par notre équipe technique, pour bien choisir, installer et entretenir votre fontaine à eau.</p></div></div>' +
      breadcrumb([{label:'Conseils'}]) +
      '<section class="wrap"><div class="blog-grid">' + sortedBlog().map(blogCard).join('') + '</div></section>' +
      '<section class="alt"><div class="wrap"><div class="faq-teaser" style="text-align:center;"><p class="eyebrow">Une question précise ?</p><h2 style="margin-top:8px;">Consultez notre FAQ ou écrivez-nous</h2><div class="hero-ctas" style="justify-content:center;margin-top:20px;"><a class="btn btn-primary" href="/faq">Voir la FAQ</a><a class="btn btn-outline" href="/contact">Contacter le service client</a></div></div></div></section>';
  }
  function pageBlogArticle(slug){
    var b = D.BLOG.filter(function(x){return x.slug===slug;})[0];
    if (!b) return pageNotFound();
    var sameTopic = D.BLOG.filter(function(x){return x.slug!==slug && x.eyebrow===b.eyebrow;});
    var rest = D.BLOG.filter(function(x){return x.slug!==slug && x.eyebrow!==b.eyebrow;}).sort(function(x,y){return blogDateKey(y.date)-blogDateKey(x.date);});
    var others = sameTopic.concat(rest).slice(0,3);
    var sourcesHtml = (b.sources && b.sources.length) ?
      '<aside class="article-sources"><p class="eyebrow">Sources</p><ul>' + b.sources.map(function(s){return '<li>'+s+'</li>';}).join('') + '</ul></aside>' : '';
    return '' +
      breadcrumb([{label:'Conseils', href:'/conseils'}, {label:b.title}]) +
      '<section class="wrap">' +
        '<article class="article-body">' +
          '<div class="article-hero">'+blogIconSvg(b.icon,90)+'</div>' +
          '<p class="eyebrow">'+b.eyebrow+'</p>' +
          '<h1>'+b.title+'</h1>' +
          '<div class="article-byline"><span class="icon-wrap" style="width:28px;height:28px;"><svg class="icon" style="width:1em;height:1em;"><use href="#i-user"/></svg></span><span>Par <strong>'+(b.author||'Équipe AquaSource')+'</strong>, responsable qualité de l\'eau chez AquaSource <span class="byline-sep">·</span> Mis à jour le '+b.date+' <span class="byline-sep">·</span> '+b.readTime+' de lecture</span></div>' +
          b.body.map(function(t){return '<p>'+t+'</p>';}).join('') +
          sourcesHtml +
        '</article>' +
      '</section>' +
      '<section class="alt"><div class="wrap"><div class="section-head"><div><p class="eyebrow">À lire aussi</p><h2>Autres conseils</h2></div></div><div class="blog-grid">' + others.map(blogCard).join('') + '</div></div></section>';
  }

  /* ---------------- CONTACT ---------------- */
  function pageContact(){
    return '' +
      '<div class="page-head"><div class="wrap"><p class="eyebrow">On vous répond sous 24h ouvrées</p><h1>Contactez-nous</h1><p>Une question sur un produit, une commande, un partenariat ? Notre équipe basée en France vous répond.</p></div></div>' +
      breadcrumb([{label:'Contact'}]) +
      '<section class="wrap"><div class="finder" style="align-items:flex-start;">' +
        '<div>' +
          '<h3 style="font-size:1.1rem;">Nos coordonnées</h3>' +
          '<div class="foot-contact" style="margin-top:16px;">' +
            '<span><svg class="icon"><use href="#i-mail"/></svg> hello@aquasource.fr</span>' +
            '<span><svg class="icon"><use href="#i-headset"/></svg> Lundi-samedi, 8h-18h30</span>' +
            '<span><svg class="icon"><use href="#i-building"/></svg> Service client basé en France</span>' +
          '</div>' +
          '<p style="margin-top:18px;font-size:.85rem;color:var(--ink-soft);">Pour une demande professionnelle (devis, contrat de maintenance), précisez le nombre de fontaines souhaité dans votre message.</p>' +
        '</div>' +
        '<form class="form-card" id="contactForm" novalidate>' +
          '<div class="form-grid">' +
            '<div class="field"><label for="cName">Nom complet</label><input id="cName" name="name" type="text" required><span class="field-error"></span></div>' +
            '<div class="field"><label for="cEmail">E-mail</label><input id="cEmail" name="email" type="email" required><span class="field-error"></span></div>' +
            '<div class="field full"><label for="cSubject">Sujet</label><select id="cSubject" name="subject"><option>Question produit</option><option>Suivi de commande</option><option>Demande professionnelle</option><option>Autre</option></select></div>' +
            '<div class="field full"><label for="cMsg">Message</label><textarea id="cMsg" name="message" required></textarea><span class="field-error"></span></div>' +
          '</div>' +
          '<button class="btn btn-primary btn-block" type="submit" style="margin-top:18px;">Envoyer le message</button>' +
          '<div class="confirm-box" id="contactConfirm" hidden style="margin-top:16px;"><span class="icon-wrap"><svg class="icon"><use href="#i-check"/></svg></span><span>Message envoyé ! Notre équipe vous répond sous 24h ouvrées. <em>(démonstration — aucun message réel n\'est transmis)</em></span></div>' +
        '</form>' +
      '</div></section>';
  }

  /* ---------------- FAQ ---------------- */
  function pageFaq(){
    return '' +
      '<div class="page-head"><div class="wrap"><p class="eyebrow">Questions fréquentes</p><h1>Foire aux questions</h1><p>Livraison, retours, abonnement, installation : les réponses aux questions les plus courantes.</p></div></div>' +
      breadcrumb([{label:'FAQ'}]) +
      '<section class="wrap"><div class="faq-list">' +
        D.FAQ.map(function(f,i){
          return '<div class="faq-item" data-faq="'+i+'"><button class="faq-q"><span>'+f.q+'</span><svg class="icon"><use href="#i-chevron"/></svg></button><div class="faq-a"><div class="faq-a-inner">'+f.a+'</div></div></div>';
        }).join('') +
      '</div></section>';
  }

  /* ---------------- STATIC / LEGAL PAGES ---------------- */
  function staticPage(eyebrow, title, intro, sections){
    var body = sections.map(function(s){
      return '<h2>'+s.h+'</h2>' + s.p.map(function(t){return '<p>'+t+'</p>';}).join('') + (s.list ? '<ul>'+s.list.map(function(li){return '<li>'+li+'</li>';}).join('')+'</ul>' : '');
    }).join('');
    return '' +
      '<div class="page-head"><div class="wrap"><p class="eyebrow">'+eyebrow+'</p><h1>'+title+'</h1><p>'+intro+'</p></div></div>' +
      breadcrumb([{label:title}]) +
      '<section class="wrap"><div class="prose">' + body + '<p class="updated-note">Dernière mise à jour : 1er septembre 2026.</p></div></section>';
  }

  function pageShipping(){
    return staticPage('Informations', 'Livraison & retours', 'Tout ce qu\'il faut savoir avant et après votre commande.', [
      {h:'Délais et frais de livraison', p:['Les commandes passées avant 14h (jours ouvrés) sont expédiées le jour même depuis notre entrepôt. Comptez ensuite 24 à 48h pour une réception en France métropolitaine.'], list:['Livraison offerte dès 49€ d\'achat','4,90€ de frais en dessous de ce montant','Livraison en Belgique, Luxembourg et Suisse sous 3 à 5 jours (frais calculés à la commande)']},
      {h:'Suivi de commande', p:['Un lien de suivi est envoyé par e-mail dès l\'expédition. Il est également consultable à tout moment depuis votre compte, rubrique « Mes commandes ».']},
      {h:'Retours et remboursement', p:['Vous disposez de 30 jours à compter de la réception pour nous retourner un article dans son emballage d\'origine. Le remboursement est effectué sous 5 jours ouvrés après réception du retour, sur le moyen de paiement utilisé lors de la commande.'], list:['Les frais de retour sont à votre charge, sauf en cas de produit défectueux','Les cartouches déjà installées ne peuvent être reprises pour des raisons d\'hygiène']}
    ]);
  }
  function pageWarranty(){
    return staticPage('Après-vente', 'Garantie & SAV', 'Une fontaine achetée chez AquaSource est couverte dès le premier jour.', [
      {h:'Garantie constructeur', p:['Toutes nos fontaines bénéficient d\'une garantie de 2 ans, pièces et main d\'œuvre, à compter de la date de facturation. Les cartouches et consommables ne sont pas couverts par cette garantie, leur usure étant liée à leur fonction.']},
      {h:'Comment faire une demande de SAV', p:['Contactez notre service client avec votre numéro de commande et une description du problème rencontré. Dans la majorité des cas, une pièce de rechange (joint, cartouche, robinet) est identifiée et expédiée sous 24h.'], list:['Réponse sous 24h ouvrées','Envoi de la pièce de rechange sans frais si le produit est encore sous garantie','Reprise du produit possible si la réparation sur site n\'est pas suffisante']},
      {h:'Contrat de maintenance professionnel', p:['Pour les fontaines en entreprise, un contrat de maintenance annuel avec remplacement de cartouche programmé est disponible sur devis. Contactez notre équipe professionnels pour en savoir plus.']}
    ]);
  }
  function pageLegal(){
    return staticPage('Informations légales', 'Mentions légales', 'Informations relatives à l\'édition, la publication et l\'hébergement du site AquaSource.', [
      {h:'Éditeur du site', p:['Le site AquaSource est édité par Monsieur David Grimbaum, entrepreneur individuel, dont le siège social est établi depuis le 15 août 2026 :'], list:[
        'Adresse : 47 rue Vivienne, 75002 Paris, France',
        'SIRET : 510 937 568 00051',
        'Activité (code APE/NAF) : 6201Z — Programmation informatique',
        'Contact : hello@aquasource.fr'
      ]},
      {h:'Directeur de la publication', p:['Monsieur David Grimbaum.']},
      {h:'Hébergement', p:['Ce site est publié et hébergé via la plateforme Claude (Anthropic).']},
      {h:'Propriété intellectuelle', p:['L\'ensemble des textes, visuels et éléments graphiques présents sur ce site sont la propriété de son éditeur ou de ses fournisseurs, sauf mention contraire, et ne peuvent être reproduits sans autorisation préalable.']},
      {h:'Tunnel de commande', p:['Le parcours d\'achat de ce site (panier, commande, paiement) est fourni à titre de démonstration fonctionnelle : aucun système de paiement n\'est actuellement connecté et aucune commande réelle n\'est traitée ou facturée.']}
    ]);
  }
  function pagePrivacy(){
    return staticPage('Vos données', 'Politique de confidentialité', 'Cette page décrit les données traitées par le site AquaSource et l\'usage des cookies et du stockage local de votre navigateur.', [
      {h:'Responsable du traitement', p:['Le responsable du traitement des données collectées sur ce site est Monsieur David Grimbaum (SIRET 510 937 568 00051), éditeur du site AquaSource. Voir la page Mentions légales pour ses coordonnées complètes.']},
      {h:'Cookies et stockage local', p:['Ce site utilise le stockage local de votre navigateur (localStorage) pour faire fonctionner le panier, votre espace client de démonstration (commandes, abonnement, informations) et retenir votre choix concernant les cookies. Ces données restent sur votre appareil, ne sont partagées avec personne et sont supprimées si vous videz les données de navigation de votre navigateur.', 'À ce jour, aucun cookie de mesure d\'audience ni cookie publicitaire n\'est déposé sur ce site. Si cela évoluait, la bannière de consentement vous permettrait d\'accepter ou de refuser ces cookies avant tout dépôt.']},
      {h:'Données collectées via les formulaires', p:['Les formulaires de ce site (contact, newsletter, commande, compte) sont fournis à titre de démonstration : les informations saisies sont traitées localement dans votre navigateur et ne sont transmises à aucun serveur ni à aucun tiers.']},
      {h:'Vos droits', p:['Conformément au RGPD, vous disposez d\'un droit d\'accès, de rectification, d\'opposition et de suppression de vos données, exerçable auprès de hello@aquasource.fr.']}
    ]);
  }
  function pageTerms(){
    return staticPage('Informations légales', 'Conditions générales de vente', 'Les présentes CGV régissent les ventes réalisées sur le site AquaSource, édité par Monsieur David Grimbaum (SIRET 510 937 568 00051).', [
      {h:'Article 1 — Objet', p:['Les présentes conditions générales de vente s\'appliquent à toute commande passée sur le site aquasource.fr entre AquaSource et un client, particulier ou professionnel. Le fait de passer commande implique l\'acceptation pleine et entière des présentes CGV.']},
      {h:'Article 2 — Produits et prix', p:['Les produits proposés sont des fontaines à eau, cartouches de filtration et accessoires associés, dans la limite des stocks disponibles. Les prix sont indiqués en euros, toutes taxes comprises (TTC), hors frais de livraison précisés avant la validation de la commande. AquaSource se réserve le droit de modifier ses prix à tout moment, les produits étant facturés sur la base du tarif en vigueur au moment de la validation de la commande.']},
      {h:'Article 3 — Commande et paiement', p:['La commande est validée après confirmation des informations de livraison et du récapitulatif. Sur ce site de démonstration, aucun moyen de paiement réel n\'est débité : voir la mention « Démonstration » affichée au moment du paiement. Sur une boutique en exploitation réelle, le paiement serait exigible intégralement à la commande, par carte bancaire ou tout autre moyen proposé au client.']},
      {h:'Article 4 — Livraison', p:['Les délais et frais de livraison sont détaillés sur la page Livraison & retours. AquaSource s\'engage à livrer les produits commandés à l\'adresse indiquée par le client lors de la commande.']},
      {h:'Article 5 — Droit de rétractation', p:['Conformément aux articles L.221-18 et suivants du Code de la consommation, le client particulier dispose d\'un délai de 14 jours à compter de la réception de sa commande pour exercer son droit de rétractation, sans avoir à justifier de motif. AquaSource étend ce délai à 30 jours dans le cadre de sa politique « satisfait ou remboursé », détaillée sur la page Livraison & retours. Le droit de rétractation ne s\'applique pas aux cartouches et consommables descellés, pour des raisons d\'hygiène et de protection de la santé.']},
      {h:'Article 6 — Garantie', p:['Tous les produits vendus bénéficient de la garantie légale de conformité et de la garantie légale contre les vices cachés, ainsi que, pour les fontaines, d\'une garantie commerciale de 2 ans détaillée sur la page Garantie & SAV.']},
      {h:'Article 7 — Responsabilité', p:['AquaSource ne saurait être tenue responsable de l\'inexécution du contrat en cas de force majeure, de rupture de stock ou d\'indisponibilité du produit. Les photographies et illustrations des produits sont non contractuelles.']},
      {h:'Article 8 — Médiation et litiges', p:['En cas de litige, le client peut recourir gratuitement à un médiateur de la consommation en vue de la résolution amiable du différend, conformément à l\'article L.616-1 du Code de la consommation. À défaut de résolution amiable, les tribunaux français sont seuls compétents, sauf disposition légale impérative contraire.']}
    ]);
  }

  /* ---------------- CART / CHECKOUT / ACCOUNT (shells filled by app.js) ---------------- */
  function pageCartShell(){
    return '' +
      '<div class="page-head"><div class="wrap"><p class="eyebrow">Étape 1/3</p><h1>Votre panier</h1><p>Vérifiez votre sélection avant de passer commande.</p></div></div>' +
      breadcrumb([{label:'Panier'}]) +
      '<section class="wrap"><div id="cartPageBody"></div></section>';
  }
  function pageCheckoutShell(){
    return '' +
      '<div class="page-head"><div class="wrap"><p class="eyebrow">Étape 2/3</p><h1>Finaliser la commande</h1><p>Ceci est une démonstration : aucune donnée bancaire n\'est demandée et aucun paiement réel n\'est effectué.</p></div></div>' +
      breadcrumb([{label:'Panier', href:'/panier'}, {label:'Commande'}]) +
      '<section class="wrap"><div id="checkoutBody"></div></section>';
  }
  function pageAccountShell(){
    return '' +
      '<div class="page-head"><div class="wrap"><p class="eyebrow">Espace client</p><h1>Mon compte</h1><p>Suivez vos commandes et gérez votre abonnement cartouches.</p></div></div>' +
      breadcrumb([{label:'Mon compte'}]) +
      '<section class="wrap"><div id="accountBody"></div></section>';
  }

  /* ---------------- À PROPOS ---------------- */
  function pageAbout(){
    var A = D.ABOUT;
    return '' +
      '<div class="page-head"><div class="wrap"><p class="eyebrow">Notre histoire</p><h1>À propos d\'AquaSource</h1><p>Une boutique spécialisée dans les fontaines à eau et la filtration, pensée pour simplifier un choix trop souvent compliqué.</p></div></div>' +
      breadcrumb([{label:'À propos'}]) +
      '<section class="wrap"><div class="prose">' + A.story.map(function(t){return '<p>'+t+'</p>';}).join('') + '</div></section>' +
      '<section class="alt"><div class="wrap"><div class="stat-grid">' +
        A.stats.map(function(s){ return '<div class="stat-tile"><span class="num">'+s.value+'</span><span class="label">'+s.label+'</span></div>'; }).join('') +
      '</div></div></section>' +
      '<section class="wrap"><div class="section-head"><div><p class="eyebrow">Ce qui nous guide</p><h2>Nos valeurs</h2></div></div><div class="why-grid">' +
        A.values.map(function(v){ return '<div class="why-item"><span class="icon-wrap"><svg class="icon"><use href="#'+v.icon+'"/></svg></span><h3>'+v.h+'</h3><p>'+v.p+'</p></div>'; }).join('') +
      '</div></section>' +
      '<section class="alt"><div class="wrap"><div class="newsletter" style="background:var(--petrol);"><div><h2>Une question avant de commander ?</h2><p>Notre service client vous aide à choisir la fontaine et la filtration adaptées à votre usage.</p></div><div class="hero-ctas"><a class="btn btn-primary" href="/contact">Nous contacter</a><a class="btn btn-ghost" href="/qualite">Voir notre démarche qualité</a></div></div></div></section>';
  }

  /* ---------------- QUALITÉ ---------------- */
  function pageQuality(){
    var Q = D.QUALITY;
    return '' +
      '<div class="page-head"><div class="wrap"><p class="eyebrow">Notre exigence</p><h1>Qualité &amp; filtration</h1><p>'+Q.intro+'</p></div></div>' +
      breadcrumb([{label:'Qualité'}]) +
      '<section class="wrap"><div class="section-head"><div><p class="eyebrow">Nos engagements</p><h2>Quatre piliers, sur chaque produit du catalogue</h2></div></div><div class="why-grid">' +
        Q.pillars.map(function(p){ return '<div class="why-item"><span class="icon-wrap"><svg class="icon"><use href="#'+p.icon+'"/></svg></span><h3>'+p.h+'</h3><p>'+p.p+'</p></div>'; }).join('') +
      '</div></section>' +
      '<section class="alt"><div class="wrap"><div class="section-head"><div><p class="eyebrow">Notre méthode</p><h2>De la sélection au service après-vente</h2></div></div><div class="why-grid">' +
        Q.process.map(function(s){ return '<div class="why-item"><h3 style="font-size:1.02rem;">'+s.h+'</h3><p>'+s.p+'</p></div>'; }).join('') +
      '</div></div></section>' +
      '<section class="wrap"><div class="cert-strip">' +
        '<span class="cert-chip"><svg class="icon"><use href="#i-shield"/></svg> Matériaux sans BPA</span>' +
        '<span class="cert-chip"><svg class="icon"><use href="#i-filter"/></svg> Filtration testée en laboratoire</span>' +
        '<span class="cert-chip"><svg class="icon"><use href="#i-check"/></svg> Conforme aux normes CE</span>' +
        '<span class="cert-chip"><svg class="icon"><use href="#i-leaf"/></svg> Cartouches recyclables</span>' +
        '<span class="cert-chip"><svg class="icon"><use href="#i-refresh"/></svg> Garantie constructeur 2 ans</span>' +
      '</div></section>' +
      '<section class="alt"><div class="wrap"><div class="section-head"><div><p class="eyebrow">Questions fréquentes</p><h2>Qualité et filtration</h2></div></div><div class="faq-list">' +
        Q.faq.map(function(f,i){ return '<div class="faq-item" data-faq="q-'+i+'"><button class="faq-q"><span>'+f.q+'</span><svg class="icon"><use href="#i-chevron"/></svg></button><div class="faq-a"><div class="faq-a-inner">'+f.a+'</div></div></div>'; }).join('') +
      '</div></div></section>';
  }

  function pageNotFound(){
    return '<section class="wrap"><div class="empty-state" style="padding-block:110px;">' +
      '<span class="icon-wrap"><svg class="icon" style="width:1.8em;height:1.8em;"><use href="#i-droplet"/></svg></span>' +
      '<h2 style="font-size:1.4rem;">Page introuvable</h2>' +
      '<p>Le contenu que vous cherchez n\'existe pas ou a été déplacé.</p>' +
      '<a class="btn btn-primary" href="/">Retour à l\'accueil</a>' +
    '</div></section>';
  }

  return {
    money: money, starsHtml: starsHtml, productCard: productCard, productGrid: productGrid, photoHtml: photoHtml,
    breadcrumb: breadcrumb, blogCard: blogCard, testimonialCard: testimonialCard,
    pageHome: pageHome, pageCategory: pageCategory, pageProduct: pageProduct, pagePro: pagePro,
    pageBlogList: pageBlogList, pageBlogArticle: pageBlogArticle, pageContact: pageContact,
    pageFaq: pageFaq, pageShipping: pageShipping, pageWarranty: pageWarranty, pageLegal: pageLegal,
    pagePrivacy: pagePrivacy, pageTerms: pageTerms, pageCartShell: pageCartShell, pageCheckoutShell: pageCheckoutShell,
    pageAccountShell: pageAccountShell, pageAbout: pageAbout, pageQuality: pageQuality, pageNotFound: pageNotFound
  };
})();
