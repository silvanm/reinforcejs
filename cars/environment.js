const COLLISIONTYPE = {
    WALL: 0,
    BADWALL: 1,
    POISON: 2,
    AGENT: 3
}

const POISON_ENABLED = true;

const NUMITEMS = 0;

const REWARD = {
    AGENT: 0,
    APPLE: 1,
    POISON: -1,
}

const NEW_ITEM_PROBABILTY = 0.7;

let addNewItems = false;

var randf = function (lo, hi) {
    return Math.random() * (hi - lo) + lo;
};
var randi = function (lo, hi) {
    return Math.floor(randf(lo, hi));
};

// A 2D vector utility
var Vec = function (x, y) {
    this.x = x;
    this.y = y;
};
Vec.prototype = {

    // utilities
    dist_from: function (v) {
        return Math.sqrt(Math.pow(this.x - v.x, 2) + Math.pow(this.y - v.y, 2));
    },
    length: function () {
        return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
    },

    // new vector returning operations
    add: function (v) {
        return new Vec(this.x + v.x, this.y + v.y);
    },
    sub: function (v) {
        return new Vec(this.x - v.x, this.y - v.y);
    },
    rotate: function (a) {  // CLOCKWISE
        return new Vec(this.x * Math.cos(a) + this.y * Math.sin(a),
            -this.x * Math.sin(a) + this.y * Math.cos(a));
    },

    // in place operations
    scale: function (s) {
        this.x *= s;
        this.y *= s;
    },
    normalize: function () {
        var d = this.length();
        this.scale(1.0 / d);
    }
};

// line intersection helper function: does line segment (p1,p2) intersect segment (p3,p4) ?
var line_intersect = function (p1, p2, p3, p4) {
    var denom = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
    if (denom === 0.0) {
        return false;
    } // parallel lines
    var ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denom;
    var ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denom;
    if (ua > 0.0 && ua < 1.0 && ub > 0.0 && ub < 1.0) {
        var up = new Vec(p1.x + ua * (p2.x - p1.x), p1.y + ua * (p2.y - p1.y));
        return {ua: ua, ub: ub, up: up, collisionWithId: null}; // up is intersection point
    }
    return false;
};

var intersec_angle = function (p1, p2, p3, p4) {
    let v1 = {
        x: p2.x - p1.x,
        y: p2.y - p1.y
    }
    let v2 = {
        x: p4.x - p3.x,
        y: p4.y - p3.y
    }

    return Math.acos((v1.x * v2.y + v1.y * v2.x) / Math.sqrt(v1.x * v1.x + v1.y * v1.y) / Math.sqrt(v2.x * v2.x + v2.y * v2.y))
}

var line_point_intersect = function (p1, p2, p0, rad) {
    var v = new Vec(p2.y - p1.y, -(p2.x - p1.x)); // perpendicular vector
    var d = Math.abs((p2.x - p1.x) * (p1.y - p0.y) - (p1.x - p0.x) * (p2.y - p1.y));
    d = d / v.length();
    if (d > rad) {
        return false;
    }

    v.normalize();
    v.scale(d);
    var up = p0.add(v);
    if (Math.abs(p2.x - p1.x) > Math.abs(p2.y - p1.y)) {
        var ua = (up.x - p1.x) / (p2.x - p1.x);
    } else {
        var ua = (up.y - p1.y) / (p2.y - p1.y);
    }
    if (ua > 0.0 && ua < 1.0) {
        return {ua: ua, up: up};
    }
    return false;
};

var wall_angle = function(wallP1, wallP2) {
    return Math.atan((wallP2.y - wallP1.y) / (wallP2.x - wallP1.x))
}

var rebound_angle = function (inboundAngle, wallP1, wallP2) {
    return 2* Math.PI - inboundAngle + wall_angle(wallP1, wallP2)
}

// Wall is made up of two points
var Wall = function (id, p1, p2, reward) {
    this.id = id;
    this.p1 = p1;
    this.p2 = p2;
    this.reward = reward;
};

var util_add_box = function (lst, x, y, w, h) {
    lst.push(new Wall('north', new Vec(x, y), new Vec(x + w, y), -1)); // north
    lst.push(new Wall('east', new Vec(x + w, y), new Vec(x + w, y + h), -1)); // east
    lst.push(new Wall('south', new Vec(x + w, y + h), new Vec(x, y + h), -1)); // south
    lst.push(new Wall('west top', new Vec(x, y + h / 2), new Vec(x, y), -1)); // west bottom
    lst.push(new Wall('west bottom', new Vec(x, y + h), new Vec(x, y + h / 2), 1)); // west top
    lst.push(new Wall('middle', new Vec(x, y + h / 2), new Vec(x + w * 0.7, y + h / 2), -1));
};

// item is circle thing on the floor that agent can interact with (see or eat, etc)
var Item = function (x, y, type) {
    this.p = new Vec(x, y); // position
    this.v = new Vec(Math.random() * 2 - 2.5, Math.random() * 2 - 2.5);
    this.type = type;
    this.rad = 10; // default radius
    this.age = 0;
    this.cleanup_ = false;
};

var World = function () {
    this.agents = [];
    this.W = layer.width();
    this.H = layer.height();

    this.clock = 0;

    // set up walls in the world
    this.walls = [];
    var pad = 0;
    util_add_box(this.walls, pad, pad, this.W - pad * 2, this.H - pad * 2);

    // set up food and poison
    this.items = [];
    for (var k = 0; k < NUMITEMS; k++) {
        var x = randf(20, this.W - 20);
        var y = randf(20, this.H - 20);

        if (POISON_ENABLED)
            var t = randi(1, 3); // food or poison (1 and 2)
        else
            var t = COLLISIONTYPE.APPLE;
        var it = new Item(x, y, t);
        this.items.push(it);
    }
};

World.prototype = {
    // helper function to get closest colliding walls/items
    stuff_collide_: function (p1, p2, check_walls, check_items, check_agents, agentUnderTest) {
        var minres = false;

        // collide with walls
        if (check_walls) {
            for (var i = 0, n = this.walls.length; i < n; i++) {
                var wall = this.walls[i];
                var res = line_intersect(p1, p2, wall.p1, wall.p2);
                if (res) {
                    res.type = wall.reward == -1 ? COLLISIONTYPE.BADWALL : COLLISIONTYPE.WALL; // 0 is wall
                    res.collisionWithId = wall.id
                    if (!minres) {
                        minres = res;
                    }
                    else {
                        // check if its closer
                        if (res.ua < minres.ua) {
                            // if yes replace it
                            minres = res;
                        }
                    }
                }
            }
        }

        // collide with items
        if (check_items) {
            for (var i = 0, n = this.items.length; i < n; i++) {
                var it = this.items[i];
                var res = line_point_intersect(p1, p2, it.p, it.rad);
                if (res) {
                    res.type = it.type; // store type of item
                    res.vx = it.v.x; // velocty information
                    res.vy = it.v.y;
                    if (!minres) {
                        minres = res;
                    }
                    else {
                        if (res.ua < minres.ua) {
                            minres = res;
                        }
                    }
                }
            }
        }

        // collide with agents
        if (check_agents) {
            for (var i = 0, n = this.agents.length; i < n; i++) {
                var targetAgent = this.agents[i];

                if (targetAgent === agentUnderTest)
                    continue;

                var res = line_point_intersect(p1, p2, targetAgent.p, targetAgent.rad);
                if (res) {
                    // console.log(`Collision ${agentUnderTest.id}=>${targetAgent.id}. Dist=${res.up.dist_from(p1)}`);
                    res.type = COLLISIONTYPE.AGENT; // store type of item. 3 == agent
                    res.vx = targetAgent.v.x; // velocty information
                    res.vy = targetAgent.v.y;
                    if (!minres) {
                        minres = res;
                    }
                    else {
                        if (res.ua < minres.ua) {
                            minres = res;
                        }
                    }
                }
            }
        }

        return minres;
    },
    tick: function () {
        // tick the environment
        this.clock++;

        // fix input to all agents based on environment
        // process eyes
        /* let wallCollison = {
             id : null,
             type : null
         };*/

        for (var i = 0, n = this.agents.length; i < n; i++) {
            var a = this.agents[i];
            a.digestion_signal = 0;
            for (var ei = 0, ne = a.eyes.length; ei < ne; ei++) {
                var e = a.eyes[ei];
                // we have a line from p to p->eyep
                var eyep = new Vec(a.p.x + e.max_range * Math.sin(a.angle + e.angle),
                    a.p.y + e.max_range * Math.cos(a.angle + e.angle));
                var res = this.stuff_collide_(a.p, eyep, true, true, false, a);
                if (res) {
                    // eye collided with wall
                    e.sensed_proximity = res.up.dist_from(a.p);

                    /*        if ((e.sensed_proximity < a.rad) && (res.type===COLLISIONTYPE.WALL || res.type===COLLISIONTYPE.BADWALL)) {
                                console.log(`Collision with wall ${res.collisionWithId}`);
                                wallCollison.id = res.collisionWithId;
                                wallCollison.type = res.type;
                            }
        */
                    e.sensed_type = res.type;
                    if ('vx' in res) {
                        e.vx = res.vx;
                        e.vy = res.vy;
                    } else {
                        e.vx = 0;
                        e.vy = 0;
                    }
                } else {
                    // no collision
                    e.sensed_proximity = e.max_range;
                    e.sensed_type = -1;
                    e.vx = 0;
                    e.vy = 0;
                }
            }
        }

        // let the agents behave in the world based on their input
        for (var i = 0, n = this.agents.length; i < n; i++) {
            this.agents[i].forward();
        }

        // apply outputs of agents on evironment
        for (var i = 0, n = this.agents.length; i < n; i++) {
            var a = this.agents[i];
            a.op = a.p; // back up old position
            a.oangle = a.angle; // and angle

            // execute agent's desired action
            var speed = 1;

            //console.log(a.action)
           /* if (a.action === 1) { // brake
                a.v += -speed;
                if (a.v < 1)
                    a.v = 1
            }
            if (a.action === 2) { // accelerate
                a.v += speed;
            }*/
            if (a.action === 1) { // up
                a.angle += Math.PI / 20;
            }
            if (a.action === 2) { // down
                a.angle -= Math.PI / 20;
            }
            a.angle = a.angle % (2 * Math.PI) // overflow

            // forward the agent by velocity
            //a.v *= 0.95; // friction

            let plannedNewPos = new Vec(a.p.x + a.v * Math.cos(a.angle), a.p.y + a.v * Math.sin(a.angle));

            // detect wall collision by prolonging the speed vectors with the directions
            speedVector = {
                p1: new Vec(a.p.x, a.p.y),
                p2: plannedNewPos
            }

            let wallCollisionData = false
            let wallCollisionId = null
            let wallCollidedWith = null
            let collisionAngle = null
            this.walls.forEach((wall) => {
                res = line_intersect(speedVector.p1, speedVector.p2, wall.p1, wall.p2)
                if (res) {
                    wallCollisionId = wall.id
                    wallCollisionData = res
                    wallCollidedWith = wall
                    collisionAngle = intersec_angle(speedVector.p1, speedVector.p2, wall.p1, wall.p2)
                }
            })

            if (wallCollisionData) {
                if (wallCollisionId === 'west bottom') {
                    a.digestion_signal = 1; // reward for hitting the right wall
                    a.wall++;
                    a.p.x = 0;
                    a.p.y = this.H / 4;
                    //a.v = 5
                    a.angle = 0
                } else {
                    a.digestion_signal = -0.2 // reward for hitting a wall
                    let oldAngle = a.angle
                    a.angle = rebound_angle(a.angle, wallCollidedWith.p1, wallCollidedWith.p2)
                    a.badwall++;
                    //console.log(`Collision with badwall ${wallCollisionId}. Old angle: ${oldAngle}. New Angle: ${a.angle}`)
                }
            } else {
                // new position
                a.p.x = plannedNewPos.x
                a.p.y = plannedNewPos.y
            }
        }

        for (var i = 0, n = this.agents.length; i < n; i++) {
            this.agents[i].totalReward += this.agents[i].digestion_signal;
        }

        // Add new items
        if (addNewItems) {
            if (this.items.length < 50 && this.clock % 10 === 0 && randf(0, 1) < NEW_ITEM_PROBABILTY) {
                var newitx = randf(20, this.W - 20);
                var newity = randf(20, this.H - 20);

                if (POISON_ENABLED)
                    var newitt = randi(1, 3); // food or poison (1 and 2)
                else
                    var newitt = COLLISIONTYPE.APPLE;
                var newit = new Item(newitx, newity, newitt);
                this.items.push(newit);
            }
        }

        // agents are given the opportunity to learn based on feedback of their action on environment
        for (var i = 0, n = this.agents.length; i < n; i++) {
            this.agents[i].backward();
        }
    }
};

const STATE_PER_EYE = 2;

// Eye sensor has a maximum range and senses walls
var Eye = function (angle) {


    this.angle = angle; // angle relative to agent its on
    this.max_range = 120;
    this.sensed_proximity = 120; // what the eye is seeing. will be set in world.tick()
    this.sensed_type = -1; // what does the eye see?
    this.vx = 0; // sensed velocity
    this.vy = 0;
};

// A single agent
var Agent = function (id) {

    this.id = id;
    // positional information
    this.p = new Vec(0, w.H/4);
    this.v = 5;
    this.op = this.p; // old position
    this.angle = 0; // direction facing

    this.actions = [];
    this.actions.push(0); // nothing
    //this.actions.push(1); // gas
    //this.actions.push(2); // brake
    this.actions.push(1); // 30% to the right
    this.actions.push(2); // 30% to the right

    // properties
    this.rad = 10; // radius
    this.eyes = [];
    for (var k = 0; k < 30; k++) {
        this.eyes.push(new Eye(k * 0.21));
    }

    this.brain = null; // set from outside

    this.reward_bonus = 0.0;
    this.digestion_signal = 0.0;

    this.wall = 0;
    this.badwall = 0;
    this.agents = 0;

    this.totalReward = 0;

    // outputs on world
    this.action = 0;

    this.prevactionix = -1;
    this.num_states = this.eyes.length * STATE_PER_EYE + 4;
};
Agent.prototype = {
    getNumStates: function () {
        return this.num_states;
    },
    getMaxNumActions: function () {
        return this.actions.length;
    },
    forward: function () {
        // in forward pass the agent simply behaves in the environment
        // create input to brain
        var num_eyes = this.eyes.length;
        var ne = num_eyes * STATE_PER_EYE;
        var input_array = new Array(this.num_states);
        for (var i = 0; i < num_eyes; i++) {
            var e = this.eyes[i];
            input_array[i * STATE_PER_EYE] = 1.0; // wall
            input_array[i * STATE_PER_EYE + 1] = 1.0; // bad wall
            if (e.sensed_type !== -1) {
                // sensed_type is 0 for wall, 1 for bad wall
                // lets do a 1-of-k encoding into the input array
                input_array[i * STATE_PER_EYE + e.sensed_type] = e.sensed_proximity / e.max_range; // normalize to [0,1]
            }
        }
        // proprioception and orientation
        input_array[ne + 0] = this.v;
        input_array[ne + 1] = this.angle / (2 * Math.PI);
        input_array[ne + 2] = this.p.x / w.W;
        input_array[ne + 3] = this.p.y / w.H;

        this.action = this.brain.act(input_array);
        //var action = this.actions[actionix];
        // demultiplex into behavior variables
        //this.action = action;
    },
    backward: function () {
        var reward = this.digestion_signal;

        this.last_reward = reward; // for vis
        this.brain.learn(reward);
        //console.log("learn " + reward)
    }
};
