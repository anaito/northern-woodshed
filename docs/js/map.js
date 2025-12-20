// --------------------
// Initialize map
// --------------------
var map = L.map('map', {
  minZoom: 7,
  maxZoom: 14,
  preferCanvas: true,
  zoomControl: false
}).setView([46.55, -87.40], 10);

// Move zoom control to bottom-right
L.control.zoom({ position: 'bottomright' }).addTo(map);

// --------------------
// Basemaps
// --------------------
var cartoDark = L.tileLayer(
  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  { maxZoom: 14, attribution: '&copy; OpenStreetMap contributors &copy; CARTO' }
);

var cartoLight = L.tileLayer(
  'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  { maxZoom: 14, attribution: '&copy; OpenStreetMap contributors &copy; CARTO' }
);

cartoDark.addTo(map); // default basemap

var baseMaps = {
  "Dark (CARTO)": cartoDark,
  "Light (CARTO)": cartoLight
};

// --------------------
// ONE grouped layer control only
// Order of group headers follows the order groups are first added.
// We'll add groups in the same order as the legend: woodshed → commercial → dnr → wildlife → infrastructure.
// --------------------
var groupedControl = L.control.groupedLayers(baseMaps, {}, {
  collapsed: false
}).addTo(map);

// ---- Scale bar ----
L.control.scale({
  position: 'bottomleft',
  metric: true,
  imperial: true,
  maxWidth: 200
}).addTo(map);

// --------------------
// Helpers
// --------------------
function normalizeText(value) {
  return (value || "")
    .toString()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// --------------------
// Styles for Woodshed extents
// --------------------
function makeWoodshedStyle(hex) {
  return function () {
    return {
      color: hex,
      weight: 1,
      opacity: 0.9,
      fillColor: hex,
      fillOpacity: 0.40,
      lineJoin: 'round',
      lineCap: 'round'
    };
  };
}

var style25  = makeWoodshedStyle('#B3CDE3');
var style50  = makeWoodshedStyle('#8C96C6');
var style75  = makeWoodshedStyle('#8856A7');
var style100 = makeWoodshedStyle('#810F7C');

// --------------------
// Helper to load GeoJSON (generic polygons)
// --------------------
function loadGeoJson(url, styleFn, label) {
  return fetch(url)
    .then(function (r) {
      if (!r.ok) throw new Error("Fetch failed: " + url + " (" + r.status + " " + r.statusText + ")");
      return r.json();
    })
    .then(function (data) {
      return L.geoJSON(data, {
        style: styleFn,
        onEachFeature: function (feature, layer) {
          var html = '<strong>' + label + '</strong>';
          if (feature.properties) {
            if (feature.properties.desc) html += '<br>' + feature.properties.desc;
            if (feature.properties.area_ha) html += '<br>Area: ' + feature.properties.area_ha.toLocaleString() + ' ha';
          }
          layer.bindPopup(html);
        }
      });
    });
}

// --------------------------------------------------
// Commercial Forest — Unique Values (owner_type)
// --------------------------------------------------
function normalizeOwnership(value) {
  return normalizeText(value);
}

var commercialForestStyleDefaults = {
  weight: 1,
  opacity: 0.9,      // line opacity
  fillOpacity: 0.4,  // fill opacity
  lineJoin: "round",
  lineCap: "round"
};

var ownershipSymbology = {
  "club or group":         { label: "Club or Group",         color: "#8C510A" },
  "forest industry":       { label: "Forest Industry",       color: "#D8B365" },
  "other":                 { label: "Other",                 color: "#F5F5F5" },
  "other business":        { label: "Other Business",        color: "#F6E8C3" },
  "private group":         { label: "Private Group",         color: "#C7EAE5" },
  "private individual(s)": { label: "Private Individual(s)", color: "#5AB4AC" },
  "trust":                 { label: "Trust",                 color: "#01665E" }
};

function commercialForestPopup(feature) {
  var owner = (feature.properties && feature.properties.owner_type) ? feature.properties.owner_type : "";
  var displayOwner = owner && owner.trim() ? owner : "Not Classified";
  return "<strong>Commercial Forest</strong><br><strong>Ownership Type:</strong> " + displayOwner;
}

function loadCommercialForest() {
  return fetch("data/commercial_forest.geojson")
    .then(function (r) {
      if (!r.ok) throw new Error("Commercial forest fetch failed: " + r.status + " " + r.statusText);
      return r.json();
    })
    .then(function (data) {
      Object.keys(ownershipSymbology).forEach(function (key) {
        var entry = ownershipSymbology[key];

        var subLayer = L.geoJSON(data, {
          filter: function (feature) {
            var raw = feature.properties ? feature.properties.owner_type : "";
            return normalizeOwnership(raw) === key;
          },
          style: function () {
            return Object.assign({}, commercialForestStyleDefaults, {
              color: entry.color,
              fillColor: entry.color
            });
          },
          onEachFeature: function (feature, layer) {
            layer.bindPopup(commercialForestPopup(feature));
          }
        });

        // OFF by default
        // subLayer.addTo(map);

        groupedControl.addOverlay(subLayer, entry.label, "Commercial Forest Ownership");
      });
    });
}

// --------------------------------------------------
// DNR Vegetation Type — Unique Values (forestType)
// --------------------------------------------------
function normalizeForestType(value) {
  return normalizeText(value);
}

var forestTypeSymbology = {
  "hardwood": { label: "Hardwood", color: "#38A800" },
  "softwood": { label: "Softwood", color: "#A87000" },
  "mixed":    { label: "Mixed",    color: "#FFFF00" },
  "planted":  { label: "Planted",  color: "#73FFDF" },
  "shrub":    { label: "Shrub",    color: "#FFD37F" },
  "other":    { label: "Other",    color: "#BED2FF" }
};

var forestTypeStyleDefaults = {
  weight: 1,
  opacity: 0.9,
  fillOpacity: 0.4,
  lineJoin: "round",
  lineCap: "round"
};

function forestTypePopup(feature) {
  var ft = (feature.properties && feature.properties.forestType) ? feature.properties.forestType : "";
  var displayFt = ft && ft.trim() ? ft : "Not Classified";
  return "<strong>DNR Vegetation Type</strong><br><strong>Type:</strong> " + displayFt;
}

function loadDnrForestType() {
  return fetch("data/dnr_forest_type.geojson")
    .then(function (r) {
      if (!r.ok) throw new Error("DNR forest type fetch failed: " + r.status + " " + r.statusText);
      return r.json();
    })
    .then(function (data) {
      var feats = (data && data.features) ? data.features : [];
      if (!feats.length) throw new Error("DNR forest type: no features found in GeoJSON.");

      var buckets = {};
      Object.keys(forestTypeSymbology).forEach(function (k) { buckets[k] = []; });
      buckets.__other__ = [];

      feats.forEach(function (f) {
        var raw = (f.properties && f.properties.forestType) ? f.properties.forestType : "";
        var key = normalizeForestType(raw);
        if (buckets.hasOwnProperty(key)) buckets[key].push(f);
        else buckets.__other__.push(f);
      });

      Object.keys(forestTypeSymbology).forEach(function (key) {
        var entry = forestTypeSymbology[key];
        var fc = { type: "FeatureCollection", features: buckets[key] };

        var subLayer = L.geoJSON(fc, {
          style: function () {
            return Object.assign({}, forestTypeStyleDefaults, {
              color: entry.color,
              fillColor: entry.color
            });
          },
          onEachFeature: function (feature, layer) {
            layer.bindPopup(forestTypePopup(feature));
          }
        });

        // OFF by default
        // subLayer.addTo(map);

        groupedControl.addOverlay(subLayer, entry.label, "DNR Vegetation Type");
      });
    });
}

// --------------------------------------------------
// Wildlife observations — SVG point symbols
// File: data/wildlife.geojson
// Attribute: name
// --------------------------------------------------
// Keys are normalized to lowercase; labels are EXACTLY as you want them displayed.
var wildlifeSymbology = {
  "american marten": { label: "American marten", shape: "diamond", fill: "#3265AF", stroke: "#FFFFFF", strokeWidth: 1 },
  "fisher":          { label: "Fisher",          shape: "circle",  fill: "#7AA7C2", stroke: "#FFFFFF", strokeWidth: 1 },
  "moose":           { label: "Moose",           shape: "square",  fill: "#FFFA56", stroke: "#000000", strokeWidth: 1 },
  "snowshoe hare":   { label: "Snowshoe hare",   shape: "hexagon", fill: "#6B327C", stroke: "#FFFFFF", strokeWidth: 1 }
};

function svgIconFor(entry, sizePx) {
  var s = sizePx || 18;
  var pad = 1;
  var box = s + 2 * pad;
  var cx = box / 2;
  var cy = box / 2;

  var fill = entry.fill;
  var stroke = entry.stroke;
  var sw = entry.strokeWidth;

  var shapeSvg = "";

  if (entry.shape === "circle") {
    var r = (s / 2) - 1;
    shapeSvg = '<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+sw+'"/>';
  } else if (entry.shape === "square") {
    var x = cx - (s / 2);
    var y = cy - (s / 2);
    shapeSvg = '<rect x="'+x+'" y="'+y+'" width="'+s+'" height="'+s+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+sw+'"/>';
  } else if (entry.shape === "diamond") {
    var top = (cy - (s / 2));
    var right = (cx + (s / 2));
    var bottom = (cy + (s / 2));
    var left = (cx - (s / 2));
    shapeSvg = '<polygon points="'+cx+','+top+' '+right+','+cy+' '+cx+','+bottom+' '+left+','+cy+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+sw+'"/>';
  } else if (entry.shape === "hexagon") {
    var r2 = s / 2;
    var x1 = cx - r2 * 0.866;
    var x2 = cx + r2 * 0.866;
    var y1 = cy - r2 * 0.5;
    var y2 = cy + r2 * 0.5;
    var topY = cy - r2;
    var botY = cy + r2;
    shapeSvg =
      '<polygon points="' +
      x1+','+y1+' '+cx+','+topY+' '+x2+','+y1+' '+x2+','+y2+' '+cx+','+botY+' '+x1+','+y2 +
      '" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+sw+'"/>';
  } else {
    var rFallback = (s / 2) - 1;
    shapeSvg = '<circle cx="'+cx+'" cy="'+cy+'" r="'+rFallback+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+sw+'"/>';
  }

  var svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="'+box+'" height="'+box+'" viewBox="0 0 '+box+' '+box+'">' +
    shapeSvg +
    '</svg>';

  return L.divIcon({
    className: "",
    html: svg,
    iconSize: [box, box],
    iconAnchor: [cx, cy]
  });
}

function loadWildlifePoints() {
  return fetch("data/wildlife.geojson")
    .then(function (r) {
      if (!r.ok) throw new Error("Wildlife fetch failed: " + r.status + " " + r.statusText);
      return r.json();
    })
    .then(function (data) {
      Object.keys(wildlifeSymbology).forEach(function (speciesKey) {
        var entry = wildlifeSymbology[speciesKey];

        var subLayer = L.geoJSON(data, {
          filter: function (feature) {
            var n = feature.properties ? feature.properties.name : "";
            return normalizeText(n) === speciesKey;
          },
          pointToLayer: function (feature, latlng) {
            return L.marker(latlng, { icon: svgIconFor(entry, 18) });
          },
          onEachFeature: function (feature, layer) {
            var n = feature.properties && feature.properties.name ? feature.properties.name : entry.label;
            layer.bindPopup("<strong>" + n + "</strong>");
          }
        });

        // OFF by default
        // subLayer.addTo(map);

        groupedControl.addOverlay(subLayer, entry.label, "Wildlife Observations");
      });
    });
}

// --------------------------------------------------
// Wood mills — points (millType = business), house icon
// File: data/mills.geojson
// Attribute: millType (all "business")
// --------------------------------------------------
function houseIcon(fillHex, strokeHex, strokeWidth, sizePx) {
  var s = sizePx || 20;
  var pad = 1;
  var box = s + 2 * pad;
  var cx = box / 2;
  var cy = box / 2;

  var fill = fillHex || "#FE9829";
  var stroke = strokeHex || "#000000";
  var sw = strokeWidth || 1;

  var roofTopY = pad + 2;
  var roofLeftX = pad + 2;
  var roofRightX = box - (pad + 2);
  var roofBaseY = cy;

  var bodyTopY = roofBaseY;
  var bodyLeftX = pad + 5;
  var bodyRightX = box - (pad + 5);
  var bodyBottomY = box - (pad + 2);

  var roof = '<polygon points="' +
    cx + ',' + roofTopY + ' ' +
    roofRightX + ',' + roofBaseY + ' ' +
    roofLeftX + ',' + roofBaseY +
    '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + sw + '" />';

  var body = '<rect x="' + bodyLeftX + '" y="' + bodyTopY + '" width="' +
    (bodyRightX - bodyLeftX) + '" height="' + (bodyBottomY - bodyTopY) +
    '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + sw + '" />';

  var svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + box + '" height="' + box + '" viewBox="0 0 ' + box + ' ' + box + '">' +
    roof + body +
    '</svg>';

  return L.divIcon({
    className: "",
    html: svg,
    iconSize: [box, box],
    iconAnchor: [cx, cy]
  });
}

function loadWoodMills() {
  return fetch("data/mills.geojson")
    .then(function (r) {
      if (!r.ok) throw new Error("Mills fetch failed: " + r.status + " " + r.statusText);
      return r.json();
    })
    .then(function (data) {
      var millsLayer = L.geoJSON(data, {
        filter: function (feature) {
          var t = feature.properties ? feature.properties.millType : "";
          return normalizeText(t) === "business";
        },
        pointToLayer: function (feature, latlng) {
          return L.marker(latlng, { icon: houseIcon("#FE9829", "#000000", 1, 20) });
        },
        onEachFeature: function (feature, layer) {
          layer.bindPopup("<strong>Wood mill</strong><br><strong>Type:</strong> business");
        }
      });

      // OFF by default
      // millsLayer.addTo(map);

      groupedControl.addOverlay(millsLayer, "Wood mills", "Infrastructure");
    });
}

// --------------------
// Load Woodshed layers FIRST, then load the remaining groups in legend order:
// woodshed → commercial → dnr → wildlife → infrastructure
// --------------------
Promise.all([
  loadGeoJson('data/ws_25_geojson.geojson',  style25,  'Woodshed extent - 25 mi distance from Ripley'),
  loadGeoJson('data/ws_50_geojson.geojson',  style50,  'Woodshed extent - 50 mi distance from Ripley'),
  loadGeoJson('data/ws_75_geojson.geojson',  style75,  'Woodshed extent - 75 mi distance from Ripley'),
  loadGeoJson('data/ws_100_geojson.geojson', style100, 'Woodshed extent - 100 mi distance from Ripley')
]).then(function (layers) {
  layers[3].addTo(map);
  layers[2].addTo(map);
  layers[1].addTo(map);
  layers[0].addTo(map);

  groupedControl.addOverlay(layers[0], '25 mi distance from Ripley',  'Woodshed Extents');
  groupedControl.addOverlay(layers[1], '50 mi distance from Ripley',  'Woodshed Extents');
  groupedControl.addOverlay(layers[2], '75 mi distance from Ripley',  'Woodshed Extents');
  groupedControl.addOverlay(layers[3], '100 mi distance from Ripley', 'Woodshed Extents');

  map.fitBounds(layers[3].getBounds(), { padding: [50, 50] });

  // Load other groups in desired order
  return loadCommercialForest();
}).then(function () {
  return loadDnrForestType();
}).then(function () {
  return loadWildlifePoints();
}).then(function () {
  return loadWoodMills();
}).catch(function (err) {
  alert(err.message);
});

// --------------------
// Legend
// --------------------
var legend = L.control({ position: 'topleft' });

legend.onAdd = function () {
  var div = L.DomUtil.create('div', 'legend');

  // Woodshed
  div.innerHTML += '<div class="legend-title">Woodshed Extent</div>';
  [
    { label: '25 mi',  color: '#B3CDE3' },
    { label: '50 mi',  color: '#8C96C6' },
    { label: '75 mi',  color: '#8856A7' },
    { label: '100 mi', color: '#810F7C' }
  ].forEach(function (d) {
    div.innerHTML +=
      '<div class="legend-item">' +
      '<span class="swatch" style="background:' + d.color + '"></span>' +
      d.label +
      '</div>';
  });

  // Commercial Forest
  div.innerHTML += '<hr style="margin:8px 0;">';
  div.innerHTML += '<div class="legend-title">Commercial Forest Ownership</div>';
  Object.keys(ownershipSymbology).forEach(function (k) {
    var e = ownershipSymbology[k];
    div.innerHTML +=
      '<div class="legend-item">' +
      '<span class="swatch" style="background:' + e.color + '"></span>' +
      e.label +
      '</div>';
  });

  // DNR Veg Type
  div.innerHTML += '<hr style="margin:8px 0;">';
  div.innerHTML += '<div class="legend-title">DNR Vegetation Type</div>';
  Object.keys(forestTypeSymbology).forEach(function (k2) {
    var e2 = forestTypeSymbology[k2];
    div.innerHTML +=
      '<div class="legend-item">' +
      '<span class="swatch" style="background:' + e2.color + '"></span>' +
      e2.label +
      '</div>';
  });

  // Wildlife (icons) — use the explicit labels so "marten" and "hare" stay lowercase
  div.innerHTML += '<hr style="margin:8px 0;">';
  div.innerHTML += '<div class="legend-title">Wildlife Observations</div>';
  Object.keys(wildlifeSymbology).forEach(function (k3) {
    var e3 = wildlifeSymbology[k3];
    var sw = svgIconFor(e3, 14).options.html;

    div.innerHTML +=
      '<div class="legend-item">' +
      '<span style="display:inline-block; width:18px; height:18px; margin-right:8px;">' + sw + '</span>' +
      e3.label +
      '</div>';
  });

  // Mills (house)
  div.innerHTML += '<hr style="margin:8px 0;">';
  div.innerHTML += '<div class="legend-title">Infrastructure</div>';
  var millSw = houseIcon("#FE9829", "#000000", 1, 14).options.html;
  div.innerHTML +=
    '<div class="legend-item">' +
    '<span style="display:inline-block; width:18px; height:18px; margin-right:8px;">' + millSw + '</span>' +
    'Wood mills' +
    '</div>';

  return div;
};

legend.addTo(map);
