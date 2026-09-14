#!/usr/bin/env node
/*
 * build-data.js — régénère data.js à partir des fichiers dans content/.
 *
 * Ce script est exécuté automatiquement par Netlify à chaque déploiement
 * (voir netlify.toml : build.command = "node build-data.js"), donc à chaque
 * fois qu'un produit, une catégorie ou un réglage est modifié via l'interface
 * d'administration (Decap CMS, /admin) et poussé sur le dépôt Git.
 *
 * Il peut aussi être lancé manuellement : `node build-data.js`.
 *
 * Sources lues :
 *   content/products/*.json     -> un fichier par produit
 *   content/categories/*.json   -> un fichier par catégorie (le nom du
 *                                   fichier, sans extension, est la clé,
 *                                   ex. content/categories/bonbonne.json -> "bonbonne")
 *   content/settings.json       -> réglages généraux (livraison, etc.)
 *   content/misc.json           -> { BLOG, FAQ, TESTIMONIALS, ABOUT, QUALITY }
 *                                   (non géré par le CMS pour l'instant, mais
 *                                   centralisé ici comme les autres contenus)
 *
 * Sortie : data.js (écrase le fichier existant), qui expose
 * window.AQUA_DATA avec la même forme qu'avant, plus une clé SETTINGS.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const CONTENT = path.join(ROOT, 'content');

function readJsonFilesSorted(dir){
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(function(f){ return f.endsWith('.json'); })
    .sort()
    .map(function(f){
      var full = path.join(dir, f);
      var data = JSON.parse(fs.readFileSync(full, 'utf8'));
      return { file: f.replace(/\.json$/, ''), data: data };
    });
}

function buildProducts(){
  var entries = readJsonFilesSorted(path.join(CONTENT, 'products'));
  // Tri numérique par id (p1, p2, ... p40) pour un ordre stable et prévisible.
  entries.sort(function(a, b){
    var na = parseInt(String(a.data.id || a.file).replace(/\D/g, ''), 10) || 0;
    var nb = parseInt(String(b.data.id || b.file).replace(/\D/g, ''), 10) || 0;
    return na - nb;
  });
  return entries.map(function(e){
    var p = Object.assign({}, e.data);
    // Le CMS édite les caractéristiques techniques sous forme de paires
    // {label, value} (plus lisible dans le formulaire d'admin) ; le site
    // les consomme sous forme de tableaux [label, value] — on convertit ici.
    if (Array.isArray(p.specs) && p.specs.length && typeof p.specs[0] === 'object' && !Array.isArray(p.specs[0])){
      p.specs = p.specs.map(function(s){ return [s.label, s.value]; });
    }
    return p;
  });
}

function buildCategories(){
  var entries = readJsonFilesSorted(path.join(CONTENT, 'categories'));
  // Le champ "order" (numéro d'affichage, éditable dans le CMS) contrôle
  // l'ordre des catégories sur la page d'accueil et dans le menu — il est
  // retiré avant écriture dans data.js, il ne sert qu'au tri ici.
  entries.sort(function(a, b){
    var oa = typeof a.data.order === 'number' ? a.data.order : 99;
    var ob = typeof b.data.order === 'number' ? b.data.order : 99;
    return oa - ob;
  });
  var out = {};
  entries.forEach(function(e){
    var data = Object.assign({}, e.data);
    delete data.order;
    out[e.file] = data;
  });
  return out;
}

function readJsonFile(p, fallback){
  if (!fs.existsSync(p)) return fallback;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function main(){
  var PRODUCTS = buildProducts();
  var CATEGORIES = buildCategories();
  var SETTINGS = readJsonFile(path.join(CONTENT, 'settings.json'), {});
  var misc = readJsonFile(path.join(CONTENT, 'misc.json'), {});
  var BLOG = misc.BLOG || [];
  var FAQ = misc.FAQ || [];
  var TESTIMONIALS = misc.TESTIMONIALS || [];
  var ABOUT = misc.ABOUT || {};
  var QUALITY = misc.QUALITY || {};

  if (!PRODUCTS.length) throw new Error('build-data.js: aucun produit trouvé dans content/products — abandon (data.js n\'a pas été régénéré).');
  if (!Object.keys(CATEGORIES).length) throw new Error('build-data.js: aucune catégorie trouvée dans content/categories — abandon.');

  var banner = '/* AquaSource — catalogue, contenus éditoriaux et données de démonstration */\n' +
    '/* Fichier généré automatiquement par build-data.js à partir de content/ — ne pas éditer à la main, cela sera écrasé au prochain déploiement. */\n';

  var body = 'window.AQUA_DATA = (function(){\n' +
    '  var CATEGORIES = ' + JSON.stringify(CATEGORIES, null, 2) + ';\n' +
    '  var PRODUCTS = ' + JSON.stringify(PRODUCTS, null, 2) + ';\n' +
    '  var BLOG = ' + JSON.stringify(BLOG, null, 2) + ';\n' +
    '  var FAQ = ' + JSON.stringify(FAQ, null, 2) + ';\n' +
    '  var TESTIMONIALS = ' + JSON.stringify(TESTIMONIALS, null, 2) + ';\n' +
    '  var ABOUT = ' + JSON.stringify(ABOUT, null, 2) + ';\n' +
    '  var QUALITY = ' + JSON.stringify(QUALITY, null, 2) + ';\n' +
    '  var SETTINGS = ' + JSON.stringify(SETTINGS, null, 2) + ';\n' +
    '  return { CATEGORIES:CATEGORIES, PRODUCTS:PRODUCTS, BLOG:BLOG, FAQ:FAQ, TESTIMONIALS:TESTIMONIALS, ABOUT:ABOUT, QUALITY:QUALITY, SETTINGS:SETTINGS };\n' +
    '})();\n';

  fs.writeFileSync(path.join(ROOT, 'data.js'), banner + body);
  console.log('build-data.js: data.js régénéré — ' + PRODUCTS.length + ' produits, ' + Object.keys(CATEGORIES).length + ' catégories, ' + BLOG.length + ' articles de blog.');
}

main();
