var geom = require('./geometry.js');

var fogColor = [0.6, 0.6, 0.6]
var wallColor = [0.95, 0.1, 0.02]
var groundColor = [0.01, 0.01, 0.22]
var ceilColor = [1.0, 0.9, 0.8]
var nearFog = 48;
var farFog = 64;
var darkDist = 72;
var brightDist = 1.5;

function interpolateColor(a, b, x)
{
    if ( x > 1 )
        x = 1;
    
    if ( x < 0 )
        x = 0;
    
    return [
        a[0] + x * (b[0] - a[0]),
        a[1] + x * (b[1] - a[1]),
        a[2] + x * (b[2] - a[2])
    ];
}

function between(a, b, x)
{
    return ((x - a) / (b - a)).clamp(0, 1);
}

function rayAngle(angle, x, fov, width)
{
    return angle + Math.atan((x / width * 2 - 1) * Math.tan(fov / 2));
}

function angleToX(angle, camAng, fov, width)
{
    return width * (Math.tan(angle - camAng) / Math.tan(fov / 2) + 1) / 2;
}

var l = true;

function rayDist(pos, camAngle, rayAngle, dest)
{
    return geom.point.len(geom.point.sub(pos, dest)) * Math.cos(Math.abs(rayAngle - camAngle));
}

function rowDist(y, height)
{
    return 15 * height / (height - y);
}

var textures = {};

function addTexture(name, href)
{
    var img = new Image();
    img.src = href;
    
    img.onLoad = function() {
        var canv = document.createElement('canvas');
        canv.width = img.width;
        canv.height = img.height;
        
        var ctx = canv.getContext('2d');
        ctx.drawImage(img);
        
        textures[name] = (ctx.data);
    }
}

function colorHex(number)
{
    number = Math.floor(number * 255);
    
    if (number < 0)
        number = 0xFFFFFFFF + number + 1;

    var res = number.toString(16).toUpperCase();
    
    if ( res.length == 1 ) 
        return "0" + res;
    
    return res;
}

function raycast(canvas, walls, camPos, camAngle, fov, ctx, sprites, spimes) // :D
{
    var id = ctx.createImageData(1, 1);
    var data = id.data;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 1;
    
    var y = null;
    
    for ( y = 0; y < canvas.height / 2; y++ )
    {
        var color = interpolateColor(ceilColor, fogColor, between(nearFog, farFog, rowDist(y, canvas.height / 2)));
        var bright = (darkDist / rowDist(y, canvas.height / 2)).clamp(0, 1);
        
        color[0] *= bright;
        color[1] *= bright;
        color[2] *= bright;
        
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width - 1, y);
        ctx.strokeStyle = "#" + colorHex(color[0]) + colorHex(color[1]) + colorHex(color[2])
        ctx.lineWidth = 1;
        ctx.stroke();
    }
    
    for (; y < canvas.height; y++ )
    {
        var prog = (canvas.height - y);
        var color = interpolateColor(groundColor, fogColor, between(nearFog, farFog, rowDist(prog, canvas.height / 2)));
        var bright = (darkDist / rowDist(y, canvas.height / 2)).clamp(0, 1);
        
        color[0] *= bright;
        color[1] *= bright;
        color[2] *= bright;
        
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width - 1, y);
        ctx.strokeStyle = "#" + colorHex(color[0]) + colorHex(color[1]) + colorHex(color[2])
        ctx.lineWidth = 1;
        ctx.stroke();
    }
    
    var nextProx = null;
    var screenDists = [];
    
    var spritesToRender = [];
        
    for ( let i = 0; i < sprites.length; i++ )
    {
        let sprite = sprites[i];
        let offs = geom.point.sub(sprite.pos, camPos);
        let depth = geom.point.len(offs);
        let ang = Math.atan2(offs.y, offs.x);
        let distance = geom.point.len(offs);
        
        let screenSprite = Object.from(sprite);
        
        if ( sprite.relPos.y > 0.1 )
        {
            screenSprite.relPos = geom.point.mul(geom.point.fromAngle(ang - camAngle), geom.point.len(offs))
            screenSprite.renderX = Math.round(screenSprite.relPos.x / screenSprite.relPos.y / Math.tan(fov / 2));
            
            if ( screenDists[renderX] > distance )
            {
                screenSprite.scale = sprite.size * canvas.height / distance;
                screenSprite.distance = distance;
                
                spritesToRender.push(screenSprite);
            }
        }
    }
    
    spritesToRender.sort(function (a, b) { return a.distance - b.distance; });
    
    for ( let x = 0; x < canvas.width; x++ )
    {
        let ang = rayAngle(camAngle, x, fov * (canvas.width / canvas.height), canvas.width);
        
        let ray = { begin: camPos, dir: geom.point.fromAngle(ang) };
        
        let curDist = 0;
        let realDist = 0;
        let curLine = null;
        let curInter = null;
        
        for ( let j = 0; j < walls.length; j++ )
        {
            let intersection = geom.lineSeg.split(ray, walls[j]);
            
            if ( intersection != null )
            {
                let ipos = geom.ray.intersectionPos(ray, walls[j]);
                let distance = rayDist(camPos, camAngle, ang, intersection);
                let rdist = geom.point.len(geom.point.sub(camPos, intersection));
                
                if ( curLine === null || rdist < realDist )
                {
                    curDist = distance;
                    realDist = rdist;
                    curLine = walls[j]
                    curInter = intersection;
                }
            }
        }
        
        if ( curLine !== null )
        {
            let fog = 1 - between(nearFog, farFog, curDist);
            screenDists.push(curDist);
            
            if ( fog > 0 )
            {
                let wsize = Math.round(curLine.height * canvas.height / curDist);
                let startY = Math.floor(canvas.height / 2 - wsize / 2) - camPos.z;
                
                let proxBright = geom.point.len(geom.point.sub(camPos, curInter)).clamp(0, 1.2) / 1.2;
                let bright = (Math.abs(geom.point.dot(geom.lineSeg.normalTo(curLine, camPos), { x: 1, y: 0 })) * 0.7 + 0.3) * proxBright * (1 - (curDist / darkDist)).clamp(0, 1);
                
                if ( nextProx == null )
                    nextProx = proxBright;
                
                if ( proxBright < nextProx )
                    nextProx = proxBright;
                
                let color = Array.from(wallColor);
                
                color[0] *= (bright * 2).clamp(0, 1);
                color[1] *= (bright * 2).clamp(0, 1);
                color[2] *= (bright * 2).clamp(0, 1);
                
                ctx.beginPath();
                ctx.moveTo(x, startY);
                ctx.lineTo(x, startY + wsize);
                ctx.strokeStyle = "#" + colorHex(color[0]) + colorHex(color[1]) + colorHex(color[2]) + colorHex((fog * 1.5).clamp(0, 1));
                ctx.lineWidth = 1;
                ctx.stroke();
                
                // for opacity
                /*
                ctx.beginPath();
                ctx.moveTo(x, startY);
                ctx.lineTo(x, startY + wsize);
                ctx.strokeStyle = "#" + colorHex(color[0]) + colorHex(color[1]) + colorHex(color[2]) + colorHex(1 - between(nearFog, farFog, curDist));
                ctx.lineWidth = 1;
                ctx.stroke();
                */
            }
        }
    }    
    
    for ( let i = 0; i < spritesToRender.length; i++ )
    {
        let spr = spritesToRender[i];
        let img = spimes[spr.type];
        
        let x = spr.renderX - (img.width / 2);
        let y = (canvas.height - img.width * spr.scale) / 2;
        
        canvas.drawImage(img, x, y, img.width * spr.scale, img.height * spr.scale);
    }
    
    // document.getElementById('shadow').innerHTML = nextProx;
}

module.exports = {
    raycast: raycast,
    addTexture: addTexture
};
