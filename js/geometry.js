/*
 * Geometrical Structures:
 * 
 *  - Point {x, y}
 *  - Line Segment {begin (Point), offset (Point)}
 *  - Ray {begin (Point), angle (Number)}
 *  - Line {begin (Point), dir (Point*)} 
 *     *used as an unit vector
 * 
 */



var opers = {
    point:
    {
        add: function add(a, b) {
            return {
                x: a.x + b.x,
                y: a.y + b.y
            };
        },
        
        sub: function sub(a, b) {
            return {
                x: a.x - b.x,
                y: a.y - b.y
            };
        },
        
        mul: function mul(v, x) {
            if ( (typeof x) == "number" )
                return {
                    x: v.x * x,
                    y: v.y * x
                };
            
            else
                return {
                    x: v.x * x.x,
                    y: v.y * x.y
                };
        },
        
        div: function mul(v, x) {
            if ( (typeof x) == "number" )
                return {
                    x: v.x / x,
                    y: v.y / x
                };
            
            else
                return {
                    x: v.x / x.x,
                    y: v.y / x.y
                };
        },
        
        dot: function dot(a, b) {
            return a.x * b.x + a.y * b.y;
        },
    
        cross: function cross(a, b) {
            return a.x * b.y - a.y * b.x
        },
        
        len: function len(v) {
            return Math.sqrt(opers.point.sqlen(v));
        },
        
        sqlen: function sqlen(v) {
            return Math.pow(v.x, 2) + Math.pow(v.y, 2);
        },
        
        unit: function unit(v) {
            return opers.point.div(v, opers.point.len(v));
        },
        
        fromAngle: function fromAngle(th) {
            return {
                x: Math.cos(th),
                y: Math.sin(th)
            };
        },
        
        inverse: function inverse(p) {
            return {
                x: -p.x,
                y: -p.y
            };
        }
    },
    
    ray: {
        intersectionPos: function intersection(ray, seg) {
            var q = opers.point.sub(ray.begin, seg.begin);
            var r = {
                x: Math.sin(ray.angle),
                y: Math.cos(ray.angle)
            };
            
            var t1 = Math.abs(opers.point.cross(seg.offset, q)) / opers.point.dot(seg.offset, r);
            var t2 = opers.point.dot(q, r) / opers.point.dot(seg.offset, r);
            
            if ( t1 >= 0 && 0 <= t2 && t2 <= 1 )
                return t1
                
            else
                return null;
        }
    },
    
    line: {
        normal: function normal(line) {
            var cn = Math.cos(90);
            var sn = Math.sin(90);
            
            return {
                x: line.dir.x * cn - line.dir.y * sn,
                y: line.dir.x * sn + line.dir.y * cn
            };
        },
        
        atPos: function linePos(line, n) {
            return opers.point.add(line.begin, opers.point.mul(opers.point.unit(line.dir), n));
        }
    },
    
    lineSeg: {
        slide: function slide(seg, vel, camPos) {
            var res = opers.point.mul(opers.point.unit(opers.point.sub(seg.offset, seg.begin)), opers.point.len(vel));
            
            if ( opers.point.dot(res, vel) < 0 )
                res = opers.point.inverse(res);
            
            // var n = opers.lineSeg.normalTo(seg, camPos);
            
            return res;
        },
        
        corner: function corner(seg, pos, radius) {
            let a = radius - opers.point.len(opers.point.sub(pos, seg.begin)) / radius;
            let b = radius - opers.point.len(opers.point.sub(pos, opers.point.add(seg.begin, seg.offset))) / radius;
            
            return Math.max(a, b, 0);
        },
        
        normalTo: function normalTo(seg, point) {
            var normal = opers.line.normal({ begin: seg.begin, dir: opers.point.unit(seg.offset) });
            var normDot = opers.point.dot(normal, opers.point.unit(opers.point.sub(opers.lineSeg.closest(seg, point), point)));
            
            if ( normDot < 0 )
                return opers.point.inverse(normal);
            
            return normal;
        },
        
        split: function split(line, seg) {
            var n = opers.line.normal(line);
            var sgend = opers.point.add(seg.begin, seg.offset);
            
            if ( opers.point.cross(seg.offset, line.dir) == 0 )
                return null;
            
            // p + tr = q + us
            // p + tr for the line segment
            // q + us for the infinite line
            var t = opers.point.cross(opers.point.sub(line.begin, seg.begin), line.dir) / opers.point.cross(seg.offset, line.dir);
            var u = opers.point.cross(opers.point.sub(line.begin, seg.begin), seg.offset) / opers.point.cross(seg.offset, line.dir);
            
            if ( 0 <= t && t <= 1 && u > 0 )
                return opers.point.add(seg.begin, opers.point.mul(seg.offset, t));
                
            else
                return null;
        },
        
        closest: function closest(seg, point) {
            var sq = opers.point.sqlen(seg.offset);
            var atp = opers.point.sub(point, seg.begin);
            var dt = opers.point.dot(atp, seg.offset);
            var t = (dt / sq).clamp(0, 1);
            
            return opers.point.add(seg.begin, opers.point.mul(seg.offset, t));
        },
        
        collides: function collides(seg, point, radius) {
            return opers.point.len(opers.point.sub(point, opers.lineSeg.closest(seg, point))) <= radius;
        },
        
        splitPos: function split(line, seg) {
            var n = opers.line.normal(line);
            var sgend = opers.point.add(seg.begin, seg.offset);
            
            var t1 = opers.point.dot(n, opers.point.sub(seg.begin, line.begin));
            var t2 = opers.point.dot(n, opers.point.sub(sgend, line.begin));
            
            if ( (t1 >= 0) == (t2 >= 0) || opers.point.cross(opers.point.unit(seg.offset), line.dir) == 0 )
                return null;
            
            // p + tr = q + us
            // p + tr for the line segment
            // q + us for the infinite line
            return opers.point.cross(opers.point.sub(line.begin, seg.begin), seg.offset) / opers.point.cross(seg.offset, line.dir);
        },
        
        lineFront: function lineFront(seg1, seg2) {
            var res = Math.sign(opers.lineSeg.pointFront(seg1, seg2.begin) + opers.lineSeg.pointFront(seg1, opers.point.add(seg2.begin, seg2.offset)));
            
            return res;
        },
        
        pointFront: function pointFront(seg, point) {
            var sgend = opers.point.add(seg.begin, seg.offset);
            var res = opers.point.cross(opers.point.sub(point, seg.begin), opers.point.sub(sgend, seg.begin));
            
            res = Math.sign(res);
            
            return res;
        }
    }
};

module.exports = opers;
