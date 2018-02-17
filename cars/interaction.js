var canvas, ctx;
var agentView = false;
var humanControls = false;

var DRAW_EYES = false;

const numAgents = 10;

let layer; // the Konva layer

let w; // the world

var carImage = new Image();
carImage.src = "img/bug.png";

function rotateAndPaintImage(context, image, angleInRad, positionX, positionY, axisX, axisY, size) {
    context.translate(positionX, positionY);
    context.rotate(angleInRad);
    context.drawImage(image, -axisX, -axisY, size, size);
    context.rotate(-angleInRad);
    context.translate(-positionX, -positionY);
}

// Draw everything
function draw() {
//ctx.lineWidth = 2;
    var agents = w.agents;

    // draw walls in environment
    //ctx.strokeStyle = "black";
    //ctx.beginPath();
    layer.destroyChildren();

    for (var i = 0, n = w.walls.length; i < n; i++) {
        var q = w.walls[i];

        var wall = new Konva.Line({
            points: [q.p1.x, q.p1.y, q.p2.x, q.p2.y],
            stroke: 'black',
            strokeWidth: 2
        });

        layer.add(wall)
    }

    // draw agents
    // color agent based on reward it is experiencing at the moment
    var r = 0;

    //ctx.fillStyle = "rgb(" + r + ", 150, 150)";
    //ctx.strokeStyle = "rgb(0,0,0)";
    for (var i = 0, n = agents.length; i < n; i++) {
        var a = agents[i];

        // draw agents body
        // ctx.arc(a.op.x, a.op.y, a.rad, 0, Math.PI * 2, true);
        // ctx.fill();
        // ctx.stroke();
        if (DRAW_EYES) {

            // draw agents sight
            for (var ei = 0, ne = a.eyes.length; ei < ne; ei++) {
                var e = a.eyes[ei];
                var sr = e.sensed_proximity;
                let color;
                if (e.sensed_type === -1) {
                    color = "rgb(50,50,50)"; // wall or nothing
                }
                if (e.sensed_type === COLLISIONTYPE.WALL) {
                    color = "rgb(0,200,0)"; // wall or nothing
                }
                if (e.sensed_type === COLLISIONTYPE.BADWALL) {
                    color = "rgb(55,10,10)";
                } // apples
                if (e.sensed_type === COLLISIONTYPE.POISON) {
                    color = "rgb(150,255,150)";
                } // poison
                if (e.sensed_type === COLLISIONTYPE.AGENT) {
                    color = "rgb(0,0,255)";
                } // agent

                layer.add(new Konva.Line({
                    points: [a.op.x, a.op.y, a.op.x + sr * Math.sin(a.oangle + e.angle),
                    a.op.y + sr * Math.cos(a.oangle + e.angle)],
                    stroke: color,
                    strokeWidth: 1
                }))
            }
        }
        // ctx.drawImage(carImage, a.op.x - 10, a.op.y - 10, 20, 20)
        layer.add(new Konva.Image({
            'image': carImage,
            'rotation': a.angle / 2 / Math.PI * 360,
            'x': a.op.x,
            'y': a.op.y,
            'offsetX': 10,
            'offsetY': 10
            })
        )
        layer.add(new Konva.Text({
            'text': a.id,
            'fontSize': 17,
            'x': a.op.x,
            'y': a.op.y,
            'offsetX': 20,
            'offsetY': 20
        }))
    }

    // draw items
    /*
    ctx.strokeStyle = "rgb(0,0,0)";
    if (!agentView) {
        for (var i = 0, n = w.items.length; i < n; i++) {
            var it = w.items[i];
            if (it.type === 1) ctx.fillStyle = "rgb(255, 150, 150)";
            if (it.type === 2) ctx.fillStyle = "rgb(150, 255, 150)";
            ctx.beginPath();
            ctx.arc(it.p.x, it.p.y, it.rad, 0, Math.PI * 2, true);
            ctx.fill();
            ctx.stroke();
        }
    }*/

    layer.draw()
}

// Tick the world
var smooth_reward_history = []; // [][];
var smooth_reward = [];
var flott = 0;

function tick() {

    if (simspeed === 3) {
        // Draw only
        for (var k = 0; k < 50; k++) {
            w.tick();
        }
    } else {
        w.tick();
    }
    draw();
    updateStats();

    flott += 1;
    for (i = 0; i < w.agents.length; i++) {
        var rew = w.agents[i].last_reward;
        if (!smooth_reward[i]) {
            smooth_reward[i] = 0;
        }
        smooth_reward[i] = smooth_reward[i] * 0.999 + rew * 0.001;
        if (flott === 50) {
            // record smooth reward
            if (smooth_reward_history[i].length >= nflot) {
                smooth_reward_history[i] = smooth_reward_history[i].slice(1);
            }
            smooth_reward_history[i].push(smooth_reward[i]);
        }
    }
    if (flott === 50) {
        flott = 0;
    }

    var agent = w.agents[0];
    if (typeof agent.expi !== 'undefined') {
        $("#expi").html(agent.expi);
    }
    if (typeof agent.tderror !== 'undefined') {
        $("#tde").html(agent.tderror.toFixed(3));
    }
}

// flot stuff
var nflot = 1000;

function initFlot() {
    var container = $("#flotreward");

    res = [];
    series = [];

    for (let i = 0; i < numAgents; i++) {
        res.push(getFlotRewards(i));
        series.push({
            data: res[i],
            lines: {fill: false}
        })
    }

    var plot = $.plot(container, series, {
        grid: {
            borderWidth: 1,
            minBorderMargin: 20,
            labelMargin: 10,
            backgroundColor: {
                colors: ["#FFF", "#e4f4f4"]
            },
            margin: {
                top: 10,
                bottom: 10,
                left: 10
            }
        },
        xaxis: {
            min: 0,
            max: nflot
        },
        yaxis: {
            min: -0.1,
            max: 0.1
        }
    });
    setInterval(function () {
        for (var i = 0; i < series.length; i++) {
            series[i].data = getFlotRewards(i);
        }
        plot.setData(series);
        plot.draw();
    }, 100);
}

function getFlotRewards(agentId) {
    // zip rewards into flot data
    var res = [];
    if (agentId >= w.agents.length || !smooth_reward_history[agentId]) {
        return res;
    }
    for (var i = 0, n = smooth_reward_history[agentId].length; i < n; i++) {
        res.push([i, smooth_reward_history[agentId][i]]);
    }
    return res;
}

var simspeed = 2;

// global world object
let current_interval_id;

let skipdraw;

function goveryfast() {
    window.clearInterval(current_interval_id);
    current_interval_id = setInterval(tick, 0);
    skipdraw = true;
    simspeed = 3;
}

function gofast() {
    window.clearInterval(current_interval_id);
    current_interval_id = setInterval(tick, 0);
    skipdraw = true;
    simspeed = 2;
}

function gonormal() {
    window.clearInterval(current_interval_id);
    current_interval_id = setInterval(tick, 30);
    skipdraw = false;
    simspeed = 1;
}

function goslow() {
    window.clearInterval(current_interval_id);
    current_interval_id = setInterval(tick, 200);
    skipdraw = false;
    simspeed = 0;
}

function saveAgent() {
    var brain = w.agents[0].brain;
    $("#mysterybox").fadeIn();
    $("#mysterybox").val(JSON.stringify(brain.toJSON()));
}

function saveAgents() {
    w.agents.forEach((agent) => {
        $.ajax({
            type: 'POST',
            url: `http://localhost:5000/braindump/${agent.id}`,
            data: JSON.stringify(agent.brain.toJSON()),
            contentType: 'application/json'
        })
    })
}

function resetAgent() {
    eval($("#agentspec").val());
    var brain = new RL.DQNAgent(env, spec);
    w.agents[0].brain = brain;
}

function loadAgent() {
    $.getJSON("agents/best.json", function (data) {
        var agent = w.agents[0].brain;
        agent.fromJSON(data); // corss your fingers...
        // set epsilon to be much lower for more optimal behavior
        agent.epsilon = 0.05;
        $("#slider").slider('value', agent.epsilon);
        $("#eps").html(agent.epsilon.toFixed(2));
        // kill learning rate to not learn
        agent.alpha = 0;
    });
}

function toggleAgentView() {
    agentView = !agentView;
}

var lastKey = null;
document.onkeydown = function (e) {
    var event = window.event ? window.event : e;
    lastKey = event.keyCode;
    if (lastKey == 37 || lastKey == 38 || lastKey == 39 || lastKey == 40) {
        enableHuman();
        e.preventDefault();
        if (lastKey == 37) {
            humanAction = 0;
        }
        if (lastKey == 39) {
            humanAction = 1;
        }
        if (lastKey == 38) {
            humanAction = 2;
        }
        if (lastKey == 40) {
            humanAction = 3;
        }
    }
};

var humanAction = -1;

function enableHuman() {
    if (!humanControls) {
        humanControls = true;
        var a = new Agent('HUMAN');
        a.forward = function () {
            this.action = humanAction;
            humanAction = -1;
        };
        a.brain = {
            learn: function (reward) {
                // Do nothing;
            }
        };
        w.agents.push(a);
        smooth_reward_history.push([]);
    }
}

function start() {

    let stage = new Konva.Stage({
        container: 'container',   // id of container <div>
        width: 700,
        height: 400
    });

    layer = new Konva.Layer();
    layer.clearBeforeDraw(true)
    stage.add(layer);

    eval($("#agentspec").val());

    w = new World();
    w.agents = [];
    for (var k = 0; k < numAgents; k++) {
        var a = new Agent(k);
        env = a;
        a.brain = new RL.DQNAgent(env, spec); // give agent a TD brain
        //a.brain = new RL.RecurrentReinforceAgent(env, {});
        w.agents.push(a);
        smooth_reward_history.push([]);
    }

    $("#slider").slider({
        min: 0,
        max: 1,
        value: w.agents[0].brain.epsilon,
        step: 0.01,
        slide: function (event, ui) {
            w.agents[0].brain.epsilon = ui.value;
            $("#eps").html(ui.value.toFixed(2));
        }
    });
    $("#eps").html(w.agents[0].brain.epsilon.toFixed(2));
    $("#slider").slider('value', w.agents[0].brain.epsilon);

    initFlot();
    gonormal();

}

function updateStats() {
    var stats = "<ul>";
    ``
    for (var i = 0; i < w.agents.length; i++) {
        stats += "<li>Player " + w.agents[i].id + ": " + w.agents[i].wall + " wall, ";
        stats += w.agents[i].badwall + " badwall, " + w.agents[i].agents + " agents, " +
            w.agents[i].totalReward + " total</li>";
    }
    stats += `Clock: ${w.clock}`;
    stats += "</ul>";
    $("#apples_and_poison").html(stats);
}