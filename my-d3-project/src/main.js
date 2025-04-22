import * as d3 from "d3";
import * as topojson from "topojson-client";

const width = 960;
const height = 600;

const svg = d3.select("#map").append("svg").attr("width", width).attr("height", height);
const donutBox = d3.select("#donut");
const infoBox = d3.select("#info");
const legendBox = d3.select("#legend");

const stateFIPS = {
  'Alabama': 1, 'Alaska': 2, 'Arizona': 4, 'Arkansas': 5, 'California': 6, 'Colorado': 8, 'Connecticut': 9,
  'Delaware': 10, 'District of Columbia': 11, 'Florida': 12, 'Georgia': 13, 'Hawaii': 15, 'Idaho': 16,
  'Illinois': 17, 'Indiana': 18, 'Iowa': 19, 'Kansas': 20, 'Kentucky': 21, 'Louisiana': 22, 'Maine': 23,
  'Maryland': 24, 'Massachusetts': 25, 'Michigan': 26, 'Minnesota': 27, 'Mississippi': 28, 'Missouri': 29,
  'Montana': 30, 'Nebraska': 31, 'Nevada': 32, 'New Hampshire': 33, 'New Jersey': 34, 'New Mexico': 35,
  'New York': 36, 'North Carolina': 37, 'North Dakota': 38, 'Ohio': 39, 'Oklahoma': 40, 'Oregon': 41,
  'Pennsylvania': 42, 'Rhode Island': 44, 'South Carolina': 45, 'South Dakota': 46, 'Tennessee': 47,
  'Texas': 48, 'Utah': 49, 'Vermont': 50, 'Virginia': 51, 'Washington': 53, 'West Virginia': 54,
  'Wisconsin': 55, 'Wyoming': 56
};

let selectedPath = null;

// Create title in JS
const title = d3.select("#top-content")
  .insert("h1", ":first-child")
  .attr("id", "chart-title")
  .style("margin-bottom", "1rem")
  .style("font-family", "'Trebuchet MS', sans-serif")
  .style("font-size", "24px")
  .style("text-align", "center")
  .style("font-weight", "bold")
  .style("transform", "translateX(20px)")
  .style("transform", "translateY(5px)")
  .text("Adult Smoking by U.S. State");



Promise.all([
  d3.json("/data/us-10m.json"),
  d3.csv("/data/smokingbystate.csv", d => ({
    State: d.State,
    SmokingPercent: parseFloat(d["Current Smoking %"].replace("%", "")),
    Current: +d["Current Smokers"].replace(/,/g, ""),
    Former: +d["Former Smokers"].replace(/,/g, ""),
    Never: +d["Never Smokers"].replace(/,/g, ""),
    TriedToQuit: +d["Tried to Quit"].replace(/,/g, "")
  }))
]).then(([us, smokingData]) => {
  const percentById = new Map(smokingData.map(d => [stateFIPS[d.State], d.SmokingPercent]));
  const nameById = new Map(smokingData.map(d => [stateFIPS[d.State], d.State]));
  const dataById = new Map(smokingData.map(d => [stateFIPS[d.State], d]));

  const color = d3.scaleQuantize().domain([6, 22]).range(d3.schemeOranges[7]);

  const projection = d3.geoAlbersUsa().translate([width / 2, height / 2]).scale(1280);
  const path = d3.geoPath().projection(projection);

  const statesData = topojson.feature(us, us.objects.states).features;

  svg.append("g")
    .selectAll("path")
    .data(statesData)
    .join("path")
    .attr("d", path)
    .attr("fill", d => {
      const val = percentById.get(d.id);
      return val ? color(val) : "#eee";
    })
    .attr("stroke", "#fff")
    .attr("stroke-width", 1)
    .append("title")
    .text(d => {
      const val = percentById.get(d.id);
      return `${nameById.get(d.id)}: ${val ? val.toFixed(1) + "%" : "No data"}`;
    });

  svg.selectAll("path")
    .on("click", function (event, d) {
      const data = dataById.get(d.id);
      if (!data) return;

      title.text(`Adult Smoking by U.S. State: ${data.State}`);
      infoBox.style("opacity", 0);
      infoBox.html("");  // clear info box (no more counts)
      infoBox.transition().duration(300).style("opacity", 1);

      if (selectedPath) {
        selectedPath.transition().duration(200).style("opacity", 0).remove();
      }

      selectedPath = svg.append("path")
        .datum(d)
        .attr("d", path)
        .attr("fill", "none")
        .attr("stroke", "#0077ff")
        .attr("stroke-width", 4)
        .attr("pointer-events", "none")
        .style("opacity", 0)
        .transition()
        .duration(300)
        .style("opacity", 1)
        .selection();

      drawDonuts(data);
    });

function drawDonuts(data) {
  donutBox.selectAll("*").remove();

  const radius = 60;
  const pie = d3.pie().value(d => d.value);
  const arc = d3.arc().innerRadius(30).outerRadius(radius);

  const donutSvg = donutBox.append("svg")
    .attr("width", 1100)
    .attr("height", 220)
    .style("font-family", "Trebuchet MS, sans-serif");

  const total = data.Current + data.Former + data.Never;
  const smokingPercent = data.SmokingPercent;
  const triedPercent = data.Current ? (data.TriedToQuit / data.Current) * 100 : 0;
  const neverPercent = (data.Never / total) * 100;
  const formerPercent = (data.Former / total) * 100;

  const donutData = [
    { label: "Current Smokers", percent: smokingPercent, count: data.Current },
    { label: "Tried to Quit", percent: triedPercent, count: data.TriedToQuit },
    { label: "Never Smoked", percent: neverPercent, count: data.Never },
    { label: "Former Smokers", percent: formerPercent, count: data.Former }
  ];

  const colorScale = d3.scaleOrdinal()
    .domain(["tick", "percent", "remainder"])
    .range(["#000000", "#f8961e", "#e0e0e0"]);

  donutData.forEach((item, i) => {
    const xOffset = 140 + i * 260;
    const yOffset = (i === 1 || i === 2) ? 140 : 100;

    const group = donutSvg.append("g")
      .attr("transform", `translate(${xOffset}, ${yOffset})`);

    // Count label (e.g., “Current Smokers: 3,000,000”)
    // Line 1: Label (bold)
    group.append("text")
    .attr("y", -90)
    .attr("text-anchor", "middle")
    .attr("font-size", "14px")
    .style("font-weight", "bold")  // 👈 bold label
    .style("opacity", 0)
    .text(`${item.label}:`)
    .transition()
    .delay(200)
    .duration(300)
    .style("opacity", 1);

    // Line 2: Count + percent
    // Line 2: Count + orange percent
    // Line 2: Count | Percent
    group.append("text")
    .attr("y", -70)
    .attr("text-anchor", "middle")
    .attr("font-size", "14px")
    .style("font-weight", "normal")
    .style("opacity", 0)
    .text(`${item.count.toLocaleString()} | ${item.percent.toFixed(1)}%`)
    .transition()
    .delay(300)
    .duration(300)
    .style("opacity", 1);





    const blackSliver = 1;
    const adjustedPercent = item.percent;
    const adjustedRemainder = 100 - adjustedPercent - blackSliver;

    const values = [
      { label: "tick", value: blackSliver },
      { label: "percent", value: adjustedPercent },
      { label: "remainder", value: adjustedRemainder }
    ];


    const arcs = pie(values);

    group.selectAll("path")
      .data(arcs)
      .join("path")
      .attr("fill", d => colorScale(d.data.label))
      .transition()
      .duration(800)
      .attrTween("d", function (d) {
        const i = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
        return t => arc(i(t));
      });
  });
}

const legendWidth = 300;
const legendHeight = 10;
const legendSvg = legendBox.append("svg").attr("width", legendWidth).attr("height", 40);

const legendScale = d3.scaleLinear().domain(color.domain()).range([0, legendWidth]);
const legendAxis = d3.axisBottom(legendScale).ticks(6).tickFormat(d => `${d}%`);

const gradientId = "legend-gradient";
const defs = legendSvg.append("defs");
const gradient = defs.append("linearGradient").attr("id", gradientId).attr("x1", "0%").attr("x2", "100%");

color.range().forEach((c, i, arr) => {
  gradient.append("stop")
    .attr("offset", `${(i / (arr.length - 1)) * 100}%`)
    .attr("stop-color", c);
});

legendSvg.append("rect")
  .attr("x", 0)
  .attr("y", 0)
  .attr("width", legendWidth)
  .attr("height", legendHeight)
  .style("fill", `url(#${gradientId})`);

legendSvg.append("g")
  .attr("transform", `translate(0, ${legendHeight})`)
  .call(legendAxis)
  .select(".domain").remove();

const nationalData = {
  State: "United States (Average)",
  SmokingPercent: d3.mean(smokingData, d => d.SmokingPercent),
  Current: d3.sum(smokingData, d => d.Current),
  Former: d3.sum(smokingData, d => d.Former),
  Never: d3.sum(smokingData, d => d.Never),
  TriedToQuit: d3.sum(smokingData, d => d.TriedToQuit)
};

title.text(`Adult Smoking by U.S. State: ${nationalData.State}`);
infoBox.html("");
drawDonuts(nationalData);
});
