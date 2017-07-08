function loadTen(year) {
    var target = document.getElementById('mainframe');
    target.className = '';
    target.innerHTML =
        '<h2>出演數排行 -- 各年度前10名</h2>' +
        '<input type="button" value="2013" onclick="loadTen(2013);" class="btn2" id="btn22013">' +
        '<input type="button" value="2014" onclick="loadTen(2014);" class="btn2" id="btn22014">' +
        '<input type="button" value="2015" onclick="loadTen(2015);" class="btn2" id="btn22015">' +
        '<input type="button" value="2016" onclick="loadTen(2016);" class="btn2" id="btn22016">' +
        '<div id="company">' +
        '</div>';
    d3.selectAll('.btn')
        .style("background-color", "#447938")
        .on('mouseover', function(d) {
            d3.select(this).style("background-color", "#6bbb5a");
            d3.select('#btn' + year)
                .style("background-color", "#6bbb5a");
        })
        .on('mouseout', function(d) {
            d3.select(this).style("background-color", "#447938");
            d3.select('#btn' + year)
                .style("background-color", "#6bbb5a");
        });

    d3.select('#btn' + year)
        .style("background-color", "#6bbb5a");

    d3.csv("csv/" + year + ".csv", function(error, data) {
        var i = 0;
        data.forEach(function(d) {
            d.amt = +d.amount;
            d.x = ++i;
        });

        // detect last chart exist or not

        var rectChart = document.getElementById('rectChart');
        if (rectChart !== null) {
            var s = d3.select('#company').select('svg').attr('height', data.length * 35);
        } else {
            var s = d3.select('#company')
                .append('svg')
                .attr({
                    'id': 'rectChart',
                    'width': '100%',
                    'height': data.length * 35
                });

        }


        // EXIT
        s.selectAll('rect').data(data).exit()
            .transition().duration(1000)
            .attr('width', '0')
            .remove();

        // UPGRADE
        s.selectAll('rect').data(data).transition().duration(1000)
            .attr({
                'width': function(d) {
                    return 0.8 * (d.amt / 40) * s.node().getBoundingClientRect().width;
                }
            });


        // ENTER
        s.selectAll('rect')
            .data(data)
            .enter()
            .append('rect')
            .attr({
                'fill': '#02769c',
                'width': 0,
                'height': 30,
                'x': 0,
                'y': function(d) {
                    return (d.x - 1) * 35;
                },
                'class': 'companyBar'
            })
            .attr({
                'fill': function(d) {
                    if (d.gender == 'M') return '#02769c';
                    else return '#c40101';
                }
            })
            .transition()
            .duration(1000)
            .attr({
                'width': function(d) {
                    return 0.8 * (d.amt / 40) * s.node().getBoundingClientRect().width;
                }
            });

        // EXIT
        s.selectAll('text').data(data).exit()
            .transition()
            .duration(1000)
            .tween('number', function(d) {
                var regex = /\S*\ -\ (\d+)/g;
                var num = regex.exec(this.textContent);
                var i = d3.interpolateRound(parseInt(num[1]), 0);
                return function(t) {
                    this.textContent = d.cv + ' - ' + i(t) + ' (' + d.main + '主役)';
                };
            }).remove();
        // UPDATE

        s.selectAll('text').data(data).transition().duration(1000)
            .tween('number', function(d) {
                var regex = /\S*\ -\ (\d+)/g;
                var num = regex.exec(this.textContent);
                var i = d3.interpolateRound(parseInt(num[1]), d.amt);
                return function(t) {
                    this.textContent = d.cv + ' - ' + i(t) + ' (' + d.main + '主役)';
                };
            });

        // ENTER
        s.selectAll('text')
            .data(data)
            .enter()
            .append('text')
            .text(function(d) {
                return 0;
            })
            .attr({
                'fill': '#fff',
                'x': 5,
                'y': function(d) {
                    return d.x * 35 - 15;
                }
            })
            .transition()
            .duration(1000)
            .tween('number', function(d) {
                var i = d3.interpolateRound(0, d.amt);
                return function(t) {
                    this.textContent = d.cv + ' - ' + i(t) + ' (' + d.main + '主役)';
                };
            });
    });
}