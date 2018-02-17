// Start with
// > ./node_modules/karma/bin/karma start

describe("AI Testsuite", function () {
    /* it("intersec_angle", function () {
         p1 = new Vec(1, 1);
         p2 = new Vec(2, 2);
         p3 = new Vec(1, 2);
         p4 = new Vec(2, 1);

         expect(intersec_angle(p1, p2, p3, p4)).toBe(Math.PI / 2);

         p1 = new Vec(1, 1);
         p2 = new Vec(2, 2);
         p3 = new Vec(1, 2);
         p4 = new Vec(2, 2);

         expect(intersec_angle(p1, p2, p3, p4).toFixed(2)).toBeCloseTo((Math.PI / 4), 2);

         p1 = new Vec(0, 0);
         p2 = new Vec(1.732, 1);

         p3 = new Vec(0, 0);
         p4 = new Vec(1, 0);

         expect(intersec_angle(p1, p2, p3, p4).toFixed(2)).toBeCloseTo(1.732, 2);

     });
 */

    it("wall_angle", function () {
        p1 = new Vec(0, 0);
        p2 = new Vec(1, 0);
        expect(wall_angle(p1, p2)).toBe(0);

        p1 = new Vec(0, 0);
        p2 = new Vec(0, 1);
        expect(wall_angle(p1, p2)).toBe(Math.PI / 2);

        // 180°
        p1 = new Vec(0, 0);
        p2 = new Vec(-1, 0);
        expect(wall_angle(p1, p2)).toBe(0);

        // vertical offset
        p1 = new Vec(0, 1);
        p2 = new Vec(-1, 1);
        expect(wall_angle(p1, p2)).toBe(0);

        // -45%
        p1 = new Vec(0, 0);
        p2 = new Vec(-1, 1);
        expect(wall_angle(p1, p2)).toBe(-Math.PI / 4);
    });

    it("wall rebound (45° in)", function () {
        wallP1 = new Vec(1, 2); // horizontal wall
        wallP2 = new Vec(2, 2);
        expect(rebound_angle(2 * Math.PI - Math.PI / 4, wallP1, wallP2)).toBeCloseTo(Math.PI / 4, 2);
    });

    it("wall rebound (45° in), wall reversed", function () {
        wallP1 = new Vec(2, 2); // horizontal wall
        wallP2 = new Vec(1, 2);
        expect(rebound_angle(2 * Math.PI - Math.PI / 4, wallP1, wallP2)).toBeCloseTo(Math.PI / 4, 2);
    });


    it("wall rebound (45° in, wall 45°)", function () {
        wallP1 = new Vec(0, 0); // 45° wall
        wallP2 = new Vec(1, 1);
        expect(rebound_angle(2 * Math.PI - Math.PI / 4, wallP1, wallP2)).toBeCloseTo(Math.PI / 2, 2);
    });

    it("wall rebound: coming from south-west to horizontal wall", function () {
        wallP1 = new Vec(1, 1);
        wallP2 = new Vec(2, 1);

        expect(rebound_angle(Math.PI / 4, wallP1, wallP2)).toBeCloseTo(Math.PI * 1.75, 2);
    });

});