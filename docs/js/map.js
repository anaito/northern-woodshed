// --------------------
// Initialize map
// --------------------
var map = L.map('map', {
    minZoom: 7,
    maxZoom: 14,
    preferCanvas: true,
    zoomControl: false
}).setView([46.55, -87.40], 10);

L.control.zoom({
    position: 'bottomright'
}).addTo(map);

// --------------------
// Basemaps
// --------------------
var cartoDark = L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 14,
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
    }
);
var cartoLight = L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 14,
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
    }
);

cartoDark.addTo(map);

var baseMaps = {
    "Dark basemap (CARTO)": cartoDark,
    "Light basemap (CARTO)": cartoLight
};

// --------------------
// Layer control (TOP LEFT)
// --------------------
var groupedControl = L.control.groupedLayers(baseMaps, {}, {
    collapsed: false,
    position: 'topleft'
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

function refreshLayerControl() {
    if (groupedControl && typeof groupedControl._update === "function") {
        groupedControl._update();
    }
}

// Integrated-legend helpers (HTML labels in layer control)
function labelWithColorSwatch(colorHex, text, alpha) {
    var a = (alpha === undefined || alpha === null) ? 1 : alpha;
    return '<span class="lc-swatch" style="background:' + colorHex + '; opacity:' + a + ';"></span>' + text;
}

function labelWithSvgIcon(svgHtml, text) {
    return '<span class="lc-icon">' + svgHtml + '</span>' + text;
}

// --------------------
// Woodshed styles
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

var style25 = makeWoodshedStyle('#B3CDE3');
var style50 = makeWoodshedStyle('#8C96C6');
var style75 = makeWoodshedStyle('#8856A7');
var style100 = makeWoodshedStyle('#810F7C');

// --------------------
// Helper to load GeoJSON (polygons)
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
function normalizeOwnership(v) {
    return normalizeText(v);
}

var commercialForestStyleDefaults = {
    weight: 1,
    opacity: 0.9,
    fillOpacity: 0.4,
    lineJoin: "round",
    lineCap: "round"
};

var ownershipSymbology = {
    "club or group": { label: "Club or Group", color: "#8C510A" },
    "forest industry": { label: "Forest Industry", color: "#D8B365" },
    "other": { label: "Unclassified", color: "#F5F5F5" },
    "other business": { label: "Other Business", color: "#F6E8C3" },
    "private group": { label: "Private Group", color: "#C7EAE5" },
    "private individual(s)": { label: "Private Individual(s)", color: "#5AB4AC" },
    "trust": { label: "Trust", color: "#01665E" }
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

                // integrated swatch in layer control
                groupedControl.addOverlay(
                    subLayer,
                    labelWithColorSwatch(entry.color, entry.label, 0.4),
                    "Commercial Forest Ownership Type"
                );
            });

            refreshLayerControl();
        })
        .catch(function (err) {
            alert(err.message);
        });
}

// --------------------------------------------------
// DNR Vegetation Type — Unique Values (forestType)
// --------------------------------------------------
function normalizeForestType(v) {
    return normalizeText(v);
}

var forestTypeSymbology = {
    "hardwood": { label: "Hardwood forest", color: "#38A800" },
    "softwood": { label: "Softwood forest", color: "#A87000" },
    "mixed": { label: "Mixed forest", color: "#FFFF00" },
    "planted": { label: "Planted", color: "#73FFDF" },
    "shrub": { label: "Shrub", color: "#FFD37F" },
    "other": { label: "Unclassified", color: "#BED2FF" }
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
    return "<strong>MiDNR Vegetation Type</strong><br><strong>Type:</strong> " + displayFt;
}

function loadDnrForestType() {
    return fetch("data/dnr_forest_type.geojson")
        .then(function (r) {
            if (!r.ok) throw new Error("MiDNR forest type fetch failed: " + r.status + " " + r.statusText);
            return r.json();
        })
        .then(function (data) {
            var feats = (data && data.features) ? data.features : [];
            if (!feats.length) throw new Error("MiDNR forest type: no features found in GeoJSON.");

            var buckets = {};
            Object.keys(forestTypeSymbology).forEach(function (k) { buckets[k] = []; });

            feats.forEach(function (f) {
                var raw = (f.properties && f.properties.forestType) ? f.properties.forestType : "";
                var key = normalizeForestType(raw);
                if (buckets.hasOwnProperty(key)) buckets[key].push(f);
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

                // integrated swatch in layer control
                groupedControl.addOverlay(
                    subLayer,
                    labelWithColorSwatch(entry.color, entry.label, 0.4),
                    "MiDNR Vegetation Type"
                );
            });

            refreshLayerControl();
        })
        .catch(function (err) {
            alert(err.message);
        });
}

// --------------------------------------------------
// Wildlife observations — SVG point symbols
// --------------------------------------------------
var wildlifeSymbology = {
    "american marten": { label: "American marten", shape: "diamond", fill: "#3265AF", stroke: "#FFFFFF", strokeWidth: 1 },
    "fisher": { label: "Fisher", shape: "circle", fill: "#7AA7C2", stroke: "#FFFFFF", strokeWidth: 1 },
    "moose": { label: "Moose", shape: "square", fill: "#FFFA56", stroke: "#000000", strokeWidth: 1 },
    "snowshoe hare": { label: "Snowshoe hare", shape: "hexagon", fill: "#712F84", stroke: "#FFFFFF", strokeWidth: 1 }
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
        shapeSvg = '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + sw + '"/>';
    } else if (entry.shape === "square") {
        var x = cx - (s / 2);
        var y = cy - (s / 2);
        shapeSvg = '<rect x="' + x + '" y="' + y + '" width="' + s + '" height="' + s + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + sw + '"/>';
    } else if (entry.shape === "diamond") {
        var top = (cy - (s / 2));
        var right = (cx + (s / 2));
        var bottom = (cy + (s / 2));
        var left = (cx - (s / 2));
        shapeSvg = '<polygon points="' + cx + ',' + top + ' ' + right + ',' + cy + ' ' + cx + ',' + bottom + ' ' + left + ',' + cy + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + sw + '"/>';
    } else if (entry.shape === "hexagon") {
        var r2 = s / 2;
        var x1 = cx - r2 * 0.866;
        var x2 = cx + r2 * 0.866;
        var y1 = cy - r2 * 0.5;
        var y2 = cy + r2 * 0.5;
        var topY = cy - r2;
        var botY = cy + r2;
        shapeSvg =
            '<polygon points="'
            + x1 + ',' + y1 + ' ' + cx + ',' + topY + ' ' + x2 + ',' + y1 + ' ' + x2 + ',' + y2 + ' ' + cx + ',' + botY + ' ' + x1 + ',' + y2
            + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + sw + '"/>';
    } else {
        var rFallback = (s / 2) - 1;
        shapeSvg = '<circle cx="' + cx + '" cy="' + cy + '" r="' + rFallback + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + sw + '"/>';
    }

    var svg =
        '<svg xmlns="http://www.w3.org/2000/svg" width="' + box + '" height="' + box + '" viewBox="0 0 ' + box + ' ' + box + '">'
        + shapeSvg
        + '</svg>';

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

                // integrated icon in layer control
                var sw = svgIconFor(entry, 14).options.html;
                groupedControl.addOverlay(
                    subLayer,
                    labelWithSvgIcon(sw, entry.label),
                    "Wildlife Observations"
                );
            });

            refreshLayerControl();
        })
        .catch(function (err) {
            alert(err.message);
        });
}

// --------------------------------------------------
// Forestry operators — house icon
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

    var roof = '<polygon points="'
        + cx + ',' + roofTopY + ' '
        + roofRightX + ',' + roofBaseY + ' '
        + roofLeftX + ',' + roofBaseY
        + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + sw + '" />';

    var body = '<rect x="' + bodyLeftX + '" y="' + bodyTopY + '" width="'
        + (bodyRightX - bodyLeftX) + '" height="' + (bodyBottomY - bodyTopY)
        + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + sw + '" />';

    var svg =
        '<svg xmlns="http://www.w3.org/2000/svg" width="' + box + '" height="' + box + '" viewBox="0 0 ' + box + ' ' + box + '">'
        + roof + body
        + '</svg>';

    return L.divIcon({
        className: "",
        html: svg,
        iconSize: [box, box],
        iconAnchor: [cx, cy]
    });
}

function loadForestryOperatorsFile(url, label) {
    return fetch(url)
        .then(function (r) {
            if (!r.ok) throw new Error(label + " fetch failed: " + r.status + " " + r.statusText);
            return r.json();
        })
        .then(function (data) {
            var layer = L.geoJSON(data, {
                filter: function (feature) {
                    var props = feature.properties || {};
                    var t = (props.Type !== undefined) ? props.Type : (props.type !== undefined ? props.type : "");
                    return normalizeText(t) === "business";
                },
                pointToLayer: function (feature, latlng) {
                    return L.marker(latlng, {
                        icon: houseIcon("#FE9829", "#000000", 1, 20)
                    });
                },
                onEachFeature: function (feature, layer) {
                    layer.bindPopup("<strong>" + label + "</strong>");
                }
            });

            var opsSw = houseIcon("#FE9829", "#000000", 1, 14).options.html;
            groupedControl.addOverlay(
                layer,
                labelWithSvgIcon(opsSw, label),
                "Facilities"
            );
            refreshLayerControl();
        })
        .catch(function (err) {
            alert(err.message);
        });
}

// --------------------------------------------------
// Woodchip suppliers — house icon
// --------------------------------------------------
var woodchipSymbology = {
    "h": { label: "Hardwood woodchip supplier", color: "#38A700" },
    "s": { label: "Softwood woodchip supplier", color: "#A87001" }
};

function loadWoodchipSuppliers() {
    return fetch("data/woodchipSuppliers.geojson")
        .then(function (r) {
            if (!r.ok) throw new Error("woodchipSuppliers fetch failed: " + r.status + " " + r.statusText);
            return r.json();
        })
        .then(function (data) {
            Object.keys(woodchipSymbology).forEach(function (k) {
                var entry = woodchipSymbology[k];

                var subLayer = L.geoJSON(data, {
                    filter: function (feature) {
                        var props = feature.properties || {};
                        return normalizeText(props.woodType) === k;
                    },
                    pointToLayer: function (feature, latlng) {
                        return L.marker(latlng, {
                            icon: houseIcon(entry.color, "#000000", 1, 20)
                        });
                    },
                    onEachFeature: function (feature, layer) {
                        layer.bindPopup("<strong>" + entry.label + "</strong>");
                    }
                });

                var sw = houseIcon(entry.color, "#000000", 1, 14).options.html;
                groupedControl.addOverlay(
                    subLayer,
                    labelWithSvgIcon(sw, entry.label),
                    "Facilities"
                );
            });

            refreshLayerControl();
        })
        .catch(function (err) {
            alert(err.message);
        });
}

// --------------------
// Harvey G. Ripley Heating Plant.
// --------------------
function ripleyIcon(fillHex, strokeHex, donutStrokeHex, sizePx) {
    var size = sizePx || 27;
    var box = size;

    var fill = fillHex || "#FFFFFF";
    var stroke = strokeHex || "#000000";
    var donutStroke = donutStrokeHex || "#000000";

    var svg =
        '<svg xmlns="http://www.w3.org/2000/svg" width="' + box + '" height="' + box + '" viewBox="0 0 24 24">' +
        '<path d="M12 2C8.134 2 5 5.134 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.866-3.134-7-7-7z" fill="' + fill + '" stroke="' + stroke + '" stroke-width="1.5"/>' +
        '<circle cx="12" cy="9" r="3.2" fill="none" stroke="' + donutStroke + '" stroke-width="1.5"/>' +
        '</svg>';

    return L.divIcon({
        className: "",
        html: svg,
        iconSize: [box, box],
        iconAnchor: [box / 2, box]
    });
}

function loadRipley() {
    return fetch("data/ripley.geojson")
        .then(function (r) {
            if (!r.ok) throw new Error("Ripley fetch failed: " + r.status + " " + r.statusText);
            return r.json();
        })
        .then(function (data) {
            var ripleyLayer = L.geoJSON(data, {
                pointToLayer: function (feature, latlng) {
                    return L.marker(latlng, {
                        icon: ripleyIcon("#FFFFFF", "#000000", "#000000", 27)
                    });
                },
                onEachFeature: function (feature, layer) {
                    layer.bindPopup("<strong>Harvey G. Ripley Heating Plant</strong>");
                }
            });

            // integrated icon in layer control (and in the "Reference" group)
            var ripSw = ripleyIcon("#FFFFFF", "#000000", "#000000", 18).options.html;
            groupedControl.addOverlay(
                ripleyLayer,
                labelWithSvgIcon(ripSw, "Harvey G. Ripley Heating Plant"),
                "Reference"
            );
            refreshLayerControl();

            // On by default
            ripleyLayer.addTo(map);

            return ripleyLayer;
        })
        .catch(function (err) {
            alert(err.message);
        });
}

// --------------------
// Load sequence (CONTROL ORDER)
// 1) Ripley (Reference)
// 2) Facilities
// 3) Wildlife
// 4) Woodshed Extents (ON by default)
// 5) Commercial Forest
// 6) MiDNR Veg Type
// --------------------
var woodshedLayersCache = null;

loadRipley()
    .then(function () {
        // Facilities next (so they appear above woodshed/commercial/dnr)
        return loadForestryOperatorsFile("data/forestryOperators2014.geojson", "Forestry operators present in 2014")
            .then(function () {
                return loadForestryOperatorsFile("data/forestryOperators2025.geojson", "Forestry operators present in 2025");
            })
            .then(function () {
                return loadWoodchipSuppliers();
            });
    })
    .then(function () {
        // Wildlife next
        return loadWildlifePoints();
    })
    .then(function () {
        // Woodshed polygons next (and ON by default)
        return Promise.all([
            loadGeoJson('data/ws_25_geojson.geojson', style25, 'Woodshed extent - 25 mi distance from Ripley Heating Plant'),
            loadGeoJson('data/ws_50_geojson.geojson', style50, 'Woodshed extent - 50 mi distance from Ripley Heating Plant'),
            loadGeoJson('data/ws_75_geojson.geojson', style75, 'Woodshed extent - 75 mi distance from Ripley Heating Plant'),
            loadGeoJson('data/ws_100_geojson.geojson', style100, 'Woodshed extent - 100 mi distance from Ripley Heating Plant')
        ]);
    })
    .then(function (layers) {
        woodshedLayersCache = layers;

        // On by default (keep enabled when entering site)
        layers[3].addTo(map);
        layers[2].addTo(map);
        layers[1].addTo(map);
        layers[0].addTo(map);

        // Integrated swatches in the layer control
        groupedControl.addOverlay(layers[0], labelWithColorSwatch("#B3CDE3", "25 mi distance from Ripley Heating Plant", 0.40), 'Woodshed Extents');
        groupedControl.addOverlay(layers[1], labelWithColorSwatch("#8C96C6", "50 mi distance from Ripley Heating Plant", 0.40), 'Woodshed Extents');
        groupedControl.addOverlay(layers[2], labelWithColorSwatch("#8856A7", "75 mi distance from Ripley Heating Plant", 0.40), 'Woodshed Extents');
        groupedControl.addOverlay(layers[3], labelWithColorSwatch("#810F7C", "100 mi distance from Ripley Heating Plant", 0.40), 'Woodshed Extents');

        map.fitBounds(layers[3].getBounds(), { padding: [50, 50] });
        refreshLayerControl();

        return loadCommercialForest();
    })
    .then(function () {
        return loadDnrForestType();
    })
    .catch(function (err) {
        alert(err.message);
    });
