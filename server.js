"use strict";
//setup server
require("dotenv").config();
const express = require("express");
const methodOverride = require("method-override");
const pg = require("pg");
const superagent = require("superagent");
const cors = require("cors");
const { values } = require("methods");

const app = express();
//useful express codes
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(express.static("./public"));
app.set("view engine", "ejs");

// const client = new pg.Client(process.env.DATABASE_URL);
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const PORT = process.env.PORT || 3030;

// Routes
app.get("/", homeHandler);
app.get("/getCountryResult", getCountryResultHandler);
app.get("/allCountries", allCountriesHandler);
app.post("/myRecords", myRecordsHandler);
app.get("/allRecords", allRecordsHandler);
app.get("/recordDetails/:id", recordDetailsHandler);
app.delete("/deleteData/:id", deleteDataHandler);

// // Handler
function homeHandler(req, res) {
  let url = "https://api.covid19api.com/world/total";
  superagent.get(url).then((result) => {
    // console.log(result.body);
    res.render("pages/home", { data: result.body });
  });
}

function getCountryResultHandler(req, res) {
  let country = req.query.country;
  let from = req.query.from;
  let to = req.query.to;

  let url = `https://api.covid19api.com/country/${country}/status/confirmed?from=${from}T00:00:00Z&to=${to}T00:00:00Z`;

  superagent.get(url).then((result) => {
    let countryData = result.body.map((item) => {
      return new Country(item);
    });
    res.render("pages/getCountryResult", { data: countryData });
  });
}

function allCountriesHandler(req, res) {
  let url = "https://api.covid19api.com/summary";

  superagent.get(url).then((result) => {
    // console.log(result.body.Countries);
    let allCountriesData = result.body.Countries.map((item) => {
      return new AllCountries(item);
    });
    res.render("pages/allCountries", { data: allCountriesData });
  });
}

function myRecordsHandler(req, res) {
  //   console.log(req.body);
  let sql =
    "INSERT INTO covid_test (country,totalconfirmed,totaldeaths, totalrecovered, date ) VALUES($1,$2,$3,$4,$5) RETURNING *;";
  let { country, totalconfirmed, totaldeaths, totalrecovered, date } = req.body;
  let safeValues = [country, totalconfirmed, totaldeaths, totalrecovered, date];

  //   let country = req.body.country;
  client.query(sql, safeValues).then((result) => {
    res.redirect("/allRecords");
  });
}

function allRecordsHandler(req, res) {
  let sql = "SELECT * FROM covid_test;";

  client.query(sql).then((result) => {
    // console.log(result.rows);
    // if
    res.render("pages/myRecords", { data: result.rows });
  });
}

function recordDetailsHandler(req, res) {
  let sql = "SELECT * FROM covid_test WHERE id =$1;";
  //   console.log(req.params.id);
  let value = [req.params.id];

  client.query(sql, value).then((result) => {
    res.render("pages/recordDetails", { data: result.rows[0] });
  });
}

function deleteDataHandler(req, res) {
  let sql = "DELETE FROM covid_test WHERE id=$1;";
  let value = [req.params.id];
  client.query(sql, value).then((result) => {
    res.redirect("/allRecords");
  });
}
// Constructors
function Country(data) {
  this.date = data.Date;
  this.cases = data.Cases;
}
// Country, Total Confirmed Cases, Total Deaths Cases, Total Recovered Cases, Date
function AllCountries(data) {
  this.country = data.Country;
  this.totalconfirmed = data.TotalConfirmed;
  this.totaldeaths = data.TotalDeaths;
  this.totalrecovered = data.TotalRecovered;
  this.date = data.Date;
}

//listining
client.connect().then(() => {
  app.listen(PORT, (req, res) => {
    console.log(`I am listining to ${PORT}`);
  });
});
