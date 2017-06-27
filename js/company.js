function loadCompany(year) {
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

    d3.csv("csv/agency-" + year + ".csv", function(error, data) {
        var i = 0;
        data.forEach(function(d) {
            d.amt = +d.amt;
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
                    return 0.8 * (d.amt / 1800) * s.node().getBoundingClientRect().width;
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
            .transition()
            .duration(1000)
            .attr({
                'width': function(d) {
                    return 0.8 * (d.amt / 1800) * s.node().getBoundingClientRect().width;
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
                    this.textContent = d.agency + ' - ' + i(t);
                };
            }).remove();
        // UPDATE

        s.selectAll('text').data(data).transition().duration(1000)
            .tween('number', function(d) {
                var regex = /\S*\ -\ (\d+)/g;
                var num = regex.exec(this.textContent);
                var i = d3.interpolateRound(parseInt(num[1]), d.amt);
                return function(t) {
                    this.textContent = d.agency + ' - ' + i(t);
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
                    this.textContent = d.agency + ' - ' + i(t);
                };
            });
    });
}