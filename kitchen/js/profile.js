function loadProfile(index) {
    d3.csv('csv/debutyear.csv', function(error, data) {
        var cv = data[index - 1];
        document.getElementById('profile_container').innerHTML = '' +
            '<style media="screen">' +
            '@font-face {' +
            'font-family: "FOTMatisseProEB";' +
            'src: url(FOTMatisseProEB.otf);' +
            '}' +
            'table td {' +
            'border: 2px solid #e6770b;' +
            'text-align: center;' +
            'font-family: "FOTMatisseProEB";' +
            '}' +
            'table td a {' +
            'color:inherit;' +
            '}' +
            'table .title {' +
            'color: #ff0000;' +
            'border: none;' +
            'text-align: center;' +
            '}' +
            'table tr {' +
            'height: 30px;' +
            'color: #ffc700;' +
            '}' +
            '.rows:hover {' +
            'background-color: #25f6b2;' +
            'color: #000000;' +
            '}' +
            '#personal {' +
            'font-size: 4em;' +
            'margin: 0;' +
            '}' +
            '</style>' +
            '<div style="float: left;"><img src="img/' + cv.NO + '.jpg" style="width: 300px; height: 300px; margin: 10px 50px 10px 60px; opacity: 1;"/></div>' +
            '<div style="float: left;">' +
            '<table>' +
            '<tr>' +
            '<td colspan="4" class="title">' +
            '◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢<br>' +
            '<h1 id="personal">個人情報、履歷</h1>' +
            '</td>' +
            '</tr>' +
            '<tr class="rows">' +
            '<td><strong>NAME</strong></td>' +
            '<td colspan="3">' + cv.cv + '</td>' +
            '</tr>' +
            '<tr class="rows">' +
            '<td><strong>出道年份</strong></td>' +
            '<td colspan="3">' + cv.debutYear + '</td>' +
            '</tr>' +
            '<tr class="rows">' +
            '<td><strong>經紀公司</strong></td>' +
            '<td colspan="3">' + cv.agency + '</td>' +
            '</tr>' +
            '<tr>' +
            '<td colspan="4" class="title">' +
            '◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢' +
            '</td>' +
            '</tr>' +
            '</table>' +
            '</div>' +
            '<div id="debut_num" style="float: center;"></div>';
        window.scrollTo(0, 0);
        // Set the dimensions of the canvas / graph
        var margin = { top: 30, right: 20, bottom: 30, left: 50 },
            width = 800 - margin.left - margin.right,
            height = 350 - margin.top - margin.bottom;

        // Parse the date / time
        var parseDate = d3.time.format("%Y").parse;

        // Set the ranges
        var x = d3.time.scale().range([0, width - 20]);
        var y = d3.scale.linear().range([height, 0]);

        // Define the axes
        var i = 1986;

        var xAxis = d3.svg.axis().scale(x)
            .orient("bottom").ticks(15)
            .tickFormat(function(d) {
                return i += 2;
            });

        var yAxis = d3.svg.axis().scale(y)
            .orient("left").ticks(5);

        // Define the line
        var valueline = d3.svg.line()
            .x(function(d) { return x(d.date); })
            .y(function(d) { return y(d.amt); });

        var dataMax = 0;

        // Adds the svg canvas
        var svg = d3.select("#debut_num")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform",
                "translate(" + margin.left + "," + margin.top + ")");

        // Get the data
        var data = new Array();
        var ob = new Object();

        for (var i = 2016; i >= 1987; i--) {
            ob.date = String(i);
            ob.amt = +cv[String(i)];
            if (ob.amt > dataMax) dataMax = ob.amt;
            data.push(JSON.parse(JSON.stringify(ob)));
        }

        // Scale the range of the data
        x.domain(d3.extent(data, function(d) { return d.date; }));
        y.domain([0, d3.max(data, function(d) { return d.amt; })]);

        // Add the valueline path.
        svg.append("path")
            .attr("class", "line")
            .attr("d", valueline(data));

        // Add the X Axis
        svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")")
            .call(xAxis)
            .append("text")
            .attr("x", x(x.ticks().pop()) - 25)
            .attr("y", -20)
            .attr("dy", "0.32em")
            .text("Year");


        // Add the Y Axis
        svg.append("g")
            .attr("class", "y axis")
            .call(yAxis)
            .append("text")
            .attr("x", 25)
            .attr("y", y(y.ticks().pop()) + 10)
            .attr("dy", "0.32em")
            .text("出演番組カウント");

        var mouseG = svg.append("g")
            .attr("class", "mouse-over-effects");

        mouseG.append("path") // this is the vertical line to follow mouse
            .attr("class", "mouse-line")
            .style("stroke", "white")
            .style("stroke-width", "2px")
            .style("opacity", "0");

        var lines = document.getElementsByClassName('line');

        var mousePerLine = mouseG.selectAll('.mouse-per-line')
            .data(data)
            .enter()
            .append("g")
            .attr("class", "mouse-per-line");

        mousePerLine.append("text")
            .attr("transform", "translate(10,3)");

        mouseG.append('svg:rect') // append a rect to catch mouse movements on canvas
            .attr('width', width - 20) // can't catch mouse events on a g element
            .attr('height', height)
            .attr('fill', 'none')
            .attr('pointer-events', 'all')
            .on('mouseout', function() { // on mouse out hide line, circles and text
                d3.select(".mouse-line")
                    .style("opacity", "0");
                d3.selectAll(".mouse-per-line circle")
                    .style("opacity", "0");
                d3.selectAll(".mouse-per-line text")
                    .style("opacity", "0");
            })
            .on('mouseover', function() { // on mouse in show line, circles and text
                d3.select(".mouse-line")
                    .style("opacity", "1");
                d3.selectAll(".mouse-per-line circle")
                    .style("opacity", "1");
                d3.selectAll(".mouse-per-line text")
                    .style("opacity", "1");
            })
            .on('mousemove', function() { // mouse moving over canvas
                var mouse = d3.mouse(this);
                var index = data.length - Math.floor(mouse[0] / (width / data.length));
                d3.select(".mouse-line")
                    .attr("d", function() {
                        var d = "M" + mouse[0] + "," + height;
                        d += " " + mouse[0] + "," + 0;
                        return d;
                    })
                    .style("stroke", function() {
                        if (index - 2 < 0) {
                            return "red";
                        } else if (data[index - 1].amt > data[index - 2].amt) {
                            return "green";
                        } else {
                            return "red";
                        }
                    });

                d3.selectAll(".mouse-per-line")
                    .attr("transform", function(d, i) {
                        d3.select(this).select('text')
                            .text(data[index - 1].amt);
                        return "translate(" + mouse[0] + "," + height * ((dataMax - data[index - 1].amt) / dataMax) + ")";
                    });
            });
    });
}