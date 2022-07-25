// Automation 2 is used to create a report with existing subcorpora for further analysis
const request = require('sync-request');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const {promises} = require("fs");
const DocxImager = require('DocxImager');

// Load JSON configs into the automation
const automation_configs = require('./automation_configs.json'); 

// Get todays date to know for which month to create report
var today = new Date();
today = today.toISOString();
today = today.substring(0, 7);

// Create folder to store report and images
promises.mkdir("./reports/" + today);

var start_year = 2022;
var start_month = 5;
var temp_date = "";
var all_dates = [];

// Create all year-month combinations until todays year-month
while (temp_date != today) {

    temp_date = start_year + "-" + start_month.toString().padStart(2, 0);
    all_dates.push(temp_date);
    start_month++;

    if (start_month == 13) {

        start_year++;
        start_month = 1;
    }
}

var stat_graphs = automation_configs.report_configs.important_terms;
var data = {};

// Get all information needed from sketch engine to create images
for (var group in stat_graphs) {
    data[group] = {};

    // For each term
    for (var term of stat_graphs[group]) {

        data[group][term] = {};

        // For each date 
        for (var date of all_dates) {
            data[group][term][date] = {};
            let date_counter = 0;

            // For each company
            for (var company of automation_configs.companies) {

                let url = 'https://api.sketchengine.eu/bonito/run.cgi/freqs?q=q[lemma="'+ term + '"]&fcrit=<attribute>/<marks><space><sort_range>&format=json&corpname=user/user123/' + company.corpus_name + '&usesubcorp=' + date;
                let res = request('GET', url, {
                    headers: {
                      'Authorization': 'Basic xyz'
                    }});
                let body = JSON.parse(res.getBody('utf8'));
                console.log(body);
                data[group][term][date][company.name] = body.fullsize;
                date_counter += body.fullsize;
                
            }

            data[group][term][date]["all"] = date_counter
        }
    }       
} 

// Create graphs for this month
for (let term_group in data) {
    let path = "./reports/" + today + "/" + term_group + ".png"
    let graph_type = "bar";
    let graph = {
        labels: [],
        datasets: []
    }; 
    for (let term in data[term_group]) {

        graph.labels.push(term);
    } 

    for (let comp of automation_configs.companies){
        let graph_data = {
            label: comp.name,
            data: [],
            backgroundColor: [comp.colour],
            borderColor: [comp.colour],
            borderWidth: 1
        }
        for (let term in data[term_group]) {

            graph_data.data.push(data[term_group][term][today][comp.name]);

        } 
        graph.datasets.push(graph_data);
    }
    create_graph(graph_type, graph, path);

}


// Create graphs for usage over time
for (let term_group in data) {
    let path = "./reports/" + today + "/" + term_group + "_overall.png"
    let graph_type = "line";
    let graph = {
        labels: all_dates,
        datasets: []
    }; 

    for (let term in data[term_group]) {

        let graph_data = {
            label: term,
            data: [],
            backgroundColor: [automation_configs.report_configs.term_colours[term]],
            borderColor: [automation_configs.report_configs.term_colours[term]],
            borderWidth: 1
        };

        for (let temp_date in data[term_group][term]) {
            graph_data.data.push(data[term_group][term][temp_date]["all"]);
        }
        graph.datasets.push(graph_data);
    } 
    
    create_graph(graph_type, graph, path);

}

create_report();


// Function to create graph images from data
async function create_graph(type, data, path) {

	const width = 600;
	const height = 400;
	const configuration = {
		type: type,
		data: data,
		options: {
		},
		plugins: [{
			id: 'background-colour',
			beforeDraw: (chart) => {
				const ctx = chart.ctx;
				ctx.save();
				ctx.fillStyle = 'white';
				ctx.fillRect(0, 0, width, height);
				ctx.restore();
			}
		}]
	};
	const chartCallback = (ChartJS) => {
		ChartJS.defaults.responsive = true;
		ChartJS.defaults.maintainAspectRatio = false;
	};
	const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height, chartCallback });
	const buffer = await chartJSNodeCanvas.renderToBuffer(configuration);
	await promises.writeFile(path, buffer, 'base64');
}

// Function to create the overall report 
async function create_report() {

    // Wait for a bit to make sure system is updated with new images (otherwise file not found error might occur)
    await new Promise(resolve => setTimeout(resolve, 10000));
    let docxImager = new DocxImager.DocxImager();

    await docxImager.load('./template.docx');


    await docxImager.replaceWithLocalImage("./reports/"+ today +"/databases.png", 1, "png");
    await docxImager.replaceWithLocalImage("./reports/"+ today +"/programming_languages.png", 2, "png");
    await docxImager.replaceWithLocalImage("./reports/"+ today +"/technologies.png", 3, "png");
    await docxImager.replaceWithLocalImage("./reports/"+ today +"/databases_overall.png", 4, "png");
    await docxImager.replaceWithLocalImage("./reports/"+ today +"/programming_languages_overall.png", 5, "png");
    await docxImager.replaceWithLocalImage("./reports/"+ today +"/technologies_overall.png", 6, "png");
    await docxImager.save("./reports/"+ today +"/Skill_Report.docx");
}