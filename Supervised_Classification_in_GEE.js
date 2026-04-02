var geometry = ee.Geometry.Polygon(
  [[[141.8764655088175, 39.61262297614899],
    [141.97474164712315, 39.61262297614899],
    [141.97474164712315, 39.65565477154019],
    [141.8764655088175, 39.65565477154019],
    [141.8764655088175, 39.61262297614899]]]
);

var rgbVis = {
  min: 0.0,
  max: 3000,
  bands: ["B4", "B3", "B2"],
};

var year = 2019;
var startDate = ee.Date.fromYMD(year,1,1);
var endDate = startDate.advance(1, "year");

var s2 = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED");

var urban = ee.FeatureCollection([
  ee.Feature(ee.Geometry.Point([141.9465353551605, 39.64016028800144]), {landcover: 0}),
  ee.Feature(ee.Geometry.Point([141.92903978028664, 39.64128587596091]), {landcover: 0}),
  ee.Feature(ee.Geometry.Point([141.9135761269061, 39.6420492531082]), {landcover: 0}),
  ee.Feature(ee.Geometry.Point([141.953491931748, 39.639612091346365]), {landcover: 0}),
  ee.Feature(ee.Geometry.Point([141.94394593228714, 39.64653810329587]), {landcover: 0}),
  ee.Feature(ee.Geometry.Point([141.9460278010932,39.64078947109826]), {landcover: 0}),
  ee.Feature(ee.Geometry.Point([141.91059525569514, 39.64366836959944]), {landcover: 0})
  ]);

var bare = ee.FeatureCollection([
  ee.Feature(ee.Geometry.Point([141.97881062387142, 39.65249804840932]), {landcover: 1}),
  ee.Feature(ee.Geometry.Point([141.96574135384273, 39.624425187783174]), {landcover: 1}),
  ee.Feature(ee.Geometry.Point([141.91439070984282, 39.630106458799986]), {landcover: 1})
  ]);
  
var water = ee.FeatureCollection([
  ee.Feature(ee.Geometry.Point([141.95392065213323, 39.63722739326068]), {landcover: 2}),
  ee.Feature(ee.Geometry.Point([141.97175145677426, 39.642846169201626]), {landcover: 2}),
  ee.Feature(ee.Geometry.Point([141.90466174926377, 39.63143624764507]), {landcover: 2}),
  ee.Feature(ee.Geometry.Point([141.9265996490568, 39.64066098907057]), {landcover: 2}),
  ee.Feature(ee.Geometry.Point([141.91370582794409, 39.64742305852973]), {landcover: 2})
  ]);
  
var vegetation = ee.FeatureCollection([
  ee.Feature(ee.Geometry.Point([141.93830852159408, 39.64245603375761]), {landcover: 3}),
  ee.Feature(ee.Geometry.Point([141.9459662312828, 39.63358106212365]), {landcover: 3}),
  ee.Feature(ee.Geometry.Point([141.90392447223155, 39.62249962846016]), {landcover: 3}),
  ee.Feature(ee.Geometry.Point([141.90712315977615, 39.62432653601907]), {landcover: 3}),
  ee.Feature(ee.Geometry.Point([141.9241087768212, 39.649480892337806]), {landcover: 3}),
  ]);

var filtered = s2
  .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 30))
  .filter(ee.Filter.date(startDate, endDate))
  .filter(ee.Filter.bounds(geometry));

var csPlus = ee.ImageCollection("GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED");
var csPlusBands = csPlus.first().bandNames();


var filteredS2WithCs = filtered.linkCollection(csPlus, csPlusBands);

function maskLowQA(image) {
  var qaBand = "cs";
  var clearThreshold = 0.5;
  var mask = image.select(qaBand).gte(clearThreshold);
  return image.updateMask(mask);
}

var filteredMasked = filteredS2WithCs
  .map(maskLowQA)
  .select("B.*");

var composite = filteredMasked.median();

Map.addLayer(composite.clip(geometry), rgbVis, "image");

var gcps = urban.merge(bare).merge(water).merge(vegetation);

var training = composite.sampleRegions({
  collection: gcps,
  properties: ["landcover"],
  scale: 10
});

var classifier = ee.Classifier.smileRandomForest(50).train({
  features: training,
  classProperty: "landcover",
  inputProperties: composite.bandNames()
});

var classified = composite.classify(classifier);
Map.centerObject(geometry);


var palette = ["#cc6d8f", "#ffc107", "#1e88e5", "#004d40"];

Map.addLayer(classified.clip(geometry), {min: 0, max: 3, palette: palette}, "Classification");

// --------------------------------------------------------------------------------

var gcps = urban.merge(bare).merge(water).merge(vegetation);
var gcps = gcps.randomColumn();

var trainingGcp = gcps.filter(ee.Filter.lt("random", 0.6));
var validationGcp = gcps.filter(ee.Filter.gte("random", 0.6));


var training = composite.sampleRegions({
  collection: trainingGcp,
  properties: ["landcover"],
  scale: 10
});
