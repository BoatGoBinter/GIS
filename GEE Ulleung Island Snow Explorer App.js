var ulleung = ee.Geometry.Rectangle([130.75, 37.42, 131.02, 37.58]);

var map = ui.Map();
map.centerObject(ulleung, 11);
map.setOptions("SATELLITE");

var s2 = ee.ImageCollection("COPERNICUS/S2_HARMONIZED");

var worldCover = ee.ImageCollection("ESA/WorldCover/v200")
  .first()
  .select("Map");

var islandLandMask = worldCover
  .neq(80)
  .clip(ulleung);

var startYear = 2016;
var endYear = 2025;

var years = [];
for (var y = startYear; y <= endYear; y++) {
  years.push(String(y));
}

function maskS2Clouds(img) {
  var qa = img.select("QA60");
  var cloudBitMask = 1 << 10;
  var cirrusBitMask = 1 << 11;

  var mask = qa.bitwiseAnd(cloudBitMask).eq(0)
    .and(qa.bitwiseAnd(cirrusBitMask).eq(0));

  return img.updateMask(mask)
    .divide(10000)
    .copyProperties(img, ["system:time_start"]);
}

function getJanuarySnow(year) {
  year = ee.Number.parse(year);

  var start = ee.Date.fromYMD(year, 1, 1);
  var end = ee.Date.fromYMD(year, 2, 1);

  var january = s2
    .filterDate(start, end)
    .filterBounds(ulleung)
    .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 80))
    .map(maskS2Clouds)
    .map(function(img) {
      var ndsi = img.normalizedDifference(["B3", "B11"]).rename("January_Mean_NDSI");
      return ndsi.copyProperties(img, ["system:time_start"]);
    });

  return january.mean().clip(ulleung).rename("January_Mean_NDSI");
}

function getSnowMask(year, threshold) {
  var snow = getJanuarySnow(year);
  return snow.gte(threshold).unmask(0).clip(ulleung);
}

function getSnowMaskIslandOnly(year, threshold) {
  var snow = getJanuarySnow(year);

  return snow
    .gte(threshold)
    .unmask(0)
    .updateMask(islandLandMask)
    .clip(ulleung);
}

var snowVis = {
  min: -0.2,
  max: 0.8,
  palette: ["1b7837", "a6dba0", "e6f5d0", "ffffff", "d9f0ff", "74add1", "2b83ba"]
};

var compareVis = {
  min: 1,
  max: 3,
  palette: ["00FF00", "FF00FF", "FFFFFF"]
};

var mainPanel = ui.Panel({
  layout: ui.Panel.Layout.flow("vertical"),
  style: {
    width: "560px",
    padding: "16px",
    backgroundColor: "#f7f7f7",
    stretch: "vertical"
  }
});

var title = ui.Label({
  value: "Ulleung Island January Snow Explorer",
  style: {
    fontSize: "24px",
    fontWeight: "bold",
    color: "#222222",
    margin: "0 0 8px 0"
  }
});

var description = ui.Label({
  value: "This app will let you explore the different snow patterns on Ulleung Island using Sentinel 2 NDSI from the Copernicus Program. You can do single-year selection or compare between two years. When you have chosen your year(s), click \"Load Snow Map\". You will be able to view the snow-index signal marked in white & blue (blue is the strongest snow signal). You will also be able to see a chart that shows a snow index across the years.\n\nNDSI (Normalized Difference Snow Index) is a satellite index that helps identify snow by comparing visible green light with shortwave infrared light. Higher NDSI values usually indicate a stronger snow-cover signal.",
  style: {
    fontSize: "13px",
    color: "#555555",
    margin: "0 0 16px 0",
    whiteSpace: "pre-wrap"
  }
});

mainPanel.add(title);
mainPanel.add(description);

var sectionStyle = {
  fontSize: "16px",
  fontWeight: "bold",
  margin: "16px 0 6px 0",
  color: "#222222"
};

var smallTextStyle = {
  fontSize: "12px",
  color: "#555555",
  margin: "0 0 8px 0"
};

var yearSelect = ui.Select({
  items: years,
  value: "2025",
  placeholder: "Select year",
  style: {
    stretch: "horizontal"
  }
});

var opacitySlider = ui.Slider({
  min: 0,
  max: 1,
  step: 0.05,
  value: 0.65,
  style: {
    stretch: "horizontal"
  }
});

var compareCheckbox = ui.Checkbox({
  label: "Compare two years",
  value: false
});

var compareYearA = ui.Select({
  items: years,
  value: "2016",
  placeholder: "First comparison year",
  style: {
    stretch: "horizontal"
  }
});

var compareYearB = ui.Select({
  items: years,
  value: "2025",
  placeholder: "Second comparison year",
  style: {
    stretch: "horizontal"
  }
});

var snowThresholdSlider = ui.Slider({
  min: 0.1,
  max: 0.6,
  step: 0.05,
  value: 0.3,
  style: {
    stretch: "horizontal"
  }
});

var comparePanel = ui.Panel({
  layout: ui.Panel.Layout.flow("vertical"),
  style: {
    shown: false,
    padding: "12px",
    backgroundColor: "white",
    margin: "8px 0 8px 0",
    border: "1px solid #dddddd"
  }
});

comparePanel.add(ui.Label({
  value: "Comparison Settings",
  style: {
    fontWeight: "bold",
    fontSize: "14px",
    margin: "0 0 8px 0"
  }
}));

var yearAIndicator = ui.Label({
  value: "GREEN",
  style: {
    backgroundColor: "#00FF00",
    color: "black",
    fontWeight: "bold",
    padding: "4px 8px",
    margin: "0 0 0 8px"
  }
});

var yearBIndicator = ui.Label({
  value: "FUCHSIA",
  style: {
    backgroundColor: "#FF00FF",
    color: "white",
    fontWeight: "bold",
    padding: "4px 8px",
    margin: "0 0 0 8px"
  }
});

var yearARow = ui.Panel({
  layout: ui.Panel.Layout.flow("horizontal"),
  style: {
    stretch: "horizontal",
    margin: "0 0 8px 0"
  }
});

yearARow.add(compareYearA);
yearARow.add(yearAIndicator);

var yearBRow = ui.Panel({
  layout: ui.Panel.Layout.flow("horizontal"),
  style: {
    stretch: "horizontal",
    margin: "0 0 8px 0"
  }
});

yearBRow.add(compareYearB);
yearBRow.add(yearBIndicator);

comparePanel.add(ui.Label("Comparison Year A"));
comparePanel.add(yearARow);
comparePanel.add(ui.Label("Comparison Year B"));
comparePanel.add(yearBRow);

comparePanel.add(ui.Label({
  value: "White = snow in both selected years",
  style: {
    fontSize: "12px",
    color: "#555555",
    margin: "0 0 8px 0",
    textAlign: "center",
    stretch: "horizontal"
  }
}));

comparePanel.add(ui.Label("Snow Threshold for Comparison (minimum NDSI value needed to count as snow)"));
comparePanel.add(snowThresholdSlider);

compareCheckbox.onChange(function(checked) {
  comparePanel.style().set("shown", checked);
});

var loadButton = ui.Button({
  label: "Load Snow Map",
  style: {
    stretch: "horizontal",
    margin: "14px 0 14px 0"
  }
});

var resetButton = ui.Button({
  label: "Reset Map View",
  style: {
    stretch: "horizontal",
    margin: "0 0 14px 0"
  }
});

resetButton.onClick(function() {
  map.centerObject(ulleung, 11);
});

var chartPanel = ui.Panel({
  layout: ui.Panel.Layout.flow("vertical"),
  style: {
    padding: "12px",
    backgroundColor: "white",
    margin: "12px 0 0 0",
    border: "1px solid #dddddd",
    stretch: "horizontal"
  }
});

mainPanel.add(ui.Label({
  value: "Single Year Map",
  style: sectionStyle
}));

mainPanel.add(ui.Label({
  value: "Choose one January snow-index layer to display.",
  style: smallTextStyle
}));

mainPanel.add(ui.Label("Year"));
mainPanel.add(yearSelect);

mainPanel.add(ui.Label({
  value: "Layer Opacity",
  style: {
    margin: "12px 0 4px 0"
  }
}));

mainPanel.add(opacitySlider);

mainPanel.add(ui.Label({
  value: "Comparison Mode",
  style: sectionStyle
}));

mainPanel.add(compareCheckbox);
mainPanel.add(comparePanel);

mainPanel.add(loadButton);
mainPanel.add(resetButton);

mainPanel.add(ui.Label({
  value: "Chart / Results",
  style: sectionStyle
}));

mainPanel.add(chartPanel);

var splitPanel = ui.SplitPanel({
  firstPanel: mainPanel,
  secondPanel: map,
  orientation: "horizontal",
  wipe: false,
  style: {
    stretch: "both"
  }
});

ui.root.clear();
ui.root.add(splitPanel);

function updateMainChart() {
  chartPanel.clear();

  chartPanel.add(ui.Label({
    value: "Loading yearly chart...",
    style: {
      color: "#555555"
    }
  }));

  var yearlyFeatures = [];

  for (var y = startYear; y <= endYear; y++) {
    var image = getJanuarySnow(String(y));

    var meanDict = image.reduceRegion({
      reducer: ee.Reducer.mean(),
      geometry: ulleung,
      scale: 20,
      maxPixels: 1e9
    });

    var feature = ee.Feature(null, {
      year: String(y),
      mean_ndsi: meanDict.get("January_Mean_NDSI")
    });

    yearlyFeatures.push(feature);

    if (y === 2017) {
      var feb2017 = s2
        .filterDate("2017-02-01", "2017-03-01")
        .filterBounds(ulleung)
        .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 80))
        .map(maskS2Clouds)
        .map(function(img) {
          var ndsi = img.normalizedDifference(["B3", "B11"]).rename("January_Mean_NDSI");
          return ndsi.copyProperties(img, ["system:time_start"]);
        })
        .mean()
        .clip(ulleung)
        .rename("January_Mean_NDSI");

      var febMeanDict = feb2017.reduceRegion({
        reducer: ee.Reducer.mean(),
        geometry: ulleung,
        scale: 20,
        maxPixels: 1e9
      });

      var febFeature = ee.Feature(null, {
        year: "2017 February",
        mean_ndsi: febMeanDict.get("January_Mean_NDSI")
      });

      yearlyFeatures.push(febFeature);
    }
  }

  var fc = ee.FeatureCollection(yearlyFeatures);

  var chart = ui.Chart.feature.byFeature({
    features: fc,
    xProperty: "year",
    yProperties: ["mean_ndsi"]
  })
    .setChartType("LineChart")
    .setOptions({
      title: "Average January NDSI Snow Signal on Ulleung Island",
      hAxis: {
        title: "Year",
        textStyle: {
          fontSize: 10
        },
        slantedText: true,
        slantedTextAngle: 45,
        showTextEvery: 1
      },
      vAxis: {
        title: "Mean January NDSI",
        textStyle: {
          fontSize: 11
        },
        titleTextStyle: {
          fontSize: 12,
          italic: true
        }
      },
      chartArea: {
        left: 70,
        right: 20,
        top: 40,
        bottom: 80,
        width: "75%",
        height: "65%"
      },
      lineWidth: 3,
      pointSize: 5,
      legend: {
        position: "none"
      }
    });

  chartPanel.clear();
  chartPanel.add(chart);
}

function addStudyArea() {
  var outline = ee.Image().byte().paint({
    featureCollection: ulleung,
    color: 1,
    width: 2
  });

  map.addLayer(outline, {
    palette: "red"
  }, "Ulleung Island Study Area");
}

function loadSingleYear() {
  map.layers().reset();

  var year = yearSelect.getValue();
  var opacity = opacitySlider.getValue();
  var image = getJanuarySnow(year);

  map.addLayer(
    image,
    snowVis,
    "January Mean NDSI " + year,
    true,
    opacity
  );

  addStudyArea();
  updateMainChart();
}

function loadComparison() {
  map.layers().reset();

  var yearA = compareYearA.getValue();
  var yearB = compareYearB.getValue();
  var threshold = snowThresholdSlider.getValue();
  var opacity = opacitySlider.getValue();

  yearAIndicator.setValue(yearA + " = GREEN");
  yearBIndicator.setValue(yearB + " = FUCHSIA");

  var maskA = getSnowMaskIslandOnly(yearA, threshold);
  var maskB = getSnowMaskIslandOnly(yearB, threshold);

  var onlyA = maskA.eq(1).and(maskB.eq(0)).multiply(1);
  var onlyB = maskB.eq(1).and(maskA.eq(0)).multiply(2);
  var both = maskA.eq(1).and(maskB.eq(1)).multiply(3);

  var comparison = onlyA.add(onlyB).add(both)
    .updateMask(onlyA.add(onlyB).add(both).gt(0))
    .updateMask(islandLandMask)
    .clip(ulleung);

  map.addLayer(
    comparison,
    compareVis,
    yearA + " vs " + yearB + " Snow Comparison",
    true,
    opacity
  );

  addStudyArea();

  chartPanel.clear();

  chartPanel.add(ui.Label({
    value: "Comparison Legend",
    style: {
      fontWeight: "bold",
      fontSize: "14px",
      margin: "0 0 8px 0"
    }
  }));

  chartPanel.add(ui.Label("Green = snow only in " + yearA));
  chartPanel.add(ui.Label("Fuchsia = snow only in " + yearB));
  chartPanel.add(ui.Label("White = snow in both years"));
  chartPanel.add(ui.Label("Transparent = no snow in either year"));
  chartPanel.add(ui.Label("Threshold: NDSI ≥ " + threshold));

  chartPanel.add(ui.Label({
    value: "Yearly Island Average",
    style: {
      fontWeight: "bold",
      fontSize: "14px",
      margin: "16px 0 8px 0"
    }
  }));

  updateMainChart();
}

loadButton.onClick(function() {
  if (compareCheckbox.getValue()) {
    loadComparison();
  } else {
    loadSingleYear();
  }
});

map.onClick(function(coords) {
  var point = ee.Geometry.Point([coords.lon, coords.lat]);

  var marker = ee.Image().byte().paint({
    featureCollection: point.buffer(80),
    color: 1,
    width: 2
  });

  map.layers().add(ui.Map.Layer(marker, {
    palette: "yellow"
  }, "Clicked Location"));

  chartPanel.clear();

  chartPanel.add(ui.Label({
    value: "Loading clicked-point chart...",
    style: {
      color: "#555555"
    }
  }));

  var pointFeatures = [];

  for (var y = startYear; y <= endYear; y++) {
    var image = getJanuarySnow(String(y));

    var value = image.reduceRegion({
      reducer: ee.Reducer.mean(),
      geometry: point,
      scale: 20,
      maxPixels: 1e9
    });

    var feature = ee.Feature(null, {
      year: String(y),
      snow_index: value.get("January_Mean_NDSI")
    });

    pointFeatures.push(feature);
  }

  var pointFC = ee.FeatureCollection(pointFeatures);

  var pointChart = ui.Chart.feature.byFeature({
    features: pointFC,
    xProperty: "year",
    yProperties: ["snow_index"]
  })
    .setChartType("LineChart")
    .setOptions({
      title: "Clicked Location January Snow Index",
      hAxis: {
        title: "Year",
        textStyle: {
          fontSize: 10
        },
        slantedText: false,
        showTextEvery: 1
      },
      vAxis: {
        title: "Mean January NDSI",
        textStyle: {
          fontSize: 11
        },
        titleTextStyle: {
          fontSize: 12,
          italic: true
        }
      },
      chartArea: {
        left: 70,
        right: 20,
        top: 40,
        bottom: 60,
        width: "75%",
        height: "65%"
      },
      lineWidth: 3,
      pointSize: 5,
      legend: {
        position: "none"
      }
    });

  chartPanel.clear();
  chartPanel.add(pointChart);
});

loadSingleYear();