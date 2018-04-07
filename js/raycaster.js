var geom = require('./geometry.js');

var fogColor = [0.6, 0.6, 0.6]
var wallColor = [0.95, 0.1, 0.02]
var groundColor = [0.01, 0.01, 0.22]
var ceilColor = [1.0, 0.9, 0.8]
var nearFog = 32;
var farFog = 96;
var darkDist = 72;
var brightDist = 1.5;

function lerp(a, b, x)
{
    return (x * (b - a)) + a;
}

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

function angleToX(relAng, fov, width)
{
    return width * (Math.tan(relAng) / Math.tan(fov / 2) + 1) / 2;
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

bLogSpr = false;

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
    var planeX = Math.cos(camAngle - Math.PI / 2) * Math.tan(fov / 2);
    var planeY = Math.sin(camAngle - Math.PI / 2) * Math.tan(fov / 2);
    
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
                let normWSize = Math.round(2 * canvas.height / curDist);
                let wsize = Math.round(curLine.height * canvas.height / curDist);
                let startY = Math.floor(canvas.height / 2 - curLine.height * canvas.height / curDist - camPos.z + 1.5 * canvas.height / curDist);
                
                let proxBright = geom.point.len(geom.point.sub(camPos, curInter)).clamp(0, 2.75) / 2.75;
                let bright = (Math.abs(geom.point.dot(geom.lineSeg.normalTo(curLine, camPos), { x: 1, y: 0 })) * 0.7 + 0.3) * proxBright * (1 - (curDist / darkDist)).clamp(0, 1);
                
                if ( nextProx == null )
                    nextProx = proxBright;
                
                if ( proxBright < nextProx )
                    nextProx = proxBright;
                
                let color = Array.from(wallColor);
                
                color[0] *= (bright).clamp(0, 1);
                color[1] *= (bright).clamp(0, 1);
                color[2] *= (bright).clamp(0, 1);
                
                ctx.beginPath();
                ctx.moveTo(x, startY);
                ctx.lineTo(x, startY + wsize);
                ctx.strokeStyle = "#" + colorHex(color[0]) + colorHex(color[1]) + colorHex(color[2]) + colorHex(Math.pow(fog, 2));
                ctx.lineWidth = 1;
                ctx.stroke();
                
                // for opacity
                ctx.beginPath();
                ctx.moveTo(x, startY);
                ctx.lineTo(x, startY + wsize);
                ctx.globalAlpha = fog;
                ctx.strokeStyle = "#" + colorHex(color[0]) + colorHex(color[1]) + colorHex(color[2]) + colorHex(Math.pow(fog, 2));
                ctx.globalAlpha = 1;
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        }
    }
    
    var spritesToRender = [];
    var theta = rayAngle(camAngle, 0, fov, canvas.width);
    
    for ( let i = 0; i < sprites.length; i++ )
    {
        let sprite = sprites[i];
        let offs = geom.point.sub(sprite.pos, camPos);
        let depth = geom.point.len(offs);
        let ang = Math.atan2(offs.y, offs.x);
        
        // planeX = 0, planeY = tan(fov / 2)
        let invDet = 1.0 / (planeX * Math.sin(camAngle) - Math.cos(camAngle) * planeY)
        
        let transformX = invDet * (Math.sin(camAngle) * offs.x - Math.cos(camAngle) * offs.y);
        let transformY = invDet * (planeX * offs.y - planeY * offs.x);
        
        let absAng = Math.min(Math.abs(ang - camAngle), Math.abs(camAngle - ang));
        let distance = geom.point.len(offs);
        
        let screenSprite = Object.assign(sprite, {});
        screenSprite.camDist = transformY;
        
        if ( transformY > 0.1 )
        {
            screenSprite.renderX = Math.round((canvas.width / 2) * (1 + transformX / transformY) - (spimes[sprite.type].width / 2 / transformY));
          
            if ( screenDists[screenSprite.renderX] > screenSprite.camDist )
            {
                // document.getElementById('shadow').innerHTML = screenSprite.renderX + " (" + offs.x + "," + offs.y + " [" + transformX + "])";
            
                screenSprite.scale = sprite.size * canvas.height / spimes[sprite.type].height / screenSprite.camDist;
                screenSprite.distance = distance;
                
                spritesToRender.push(screenSprite);
            }
        }
    }
    
    spritesToRender.sort(function (a, b) { return b.distance - a.distance; });
    
    for ( let i = 0; i < spritesToRender.length; i++ )
    {
        let spr = spritesToRender[i];
        let img = spimes[spr.type];
        
        let x = spr.renderX;
        let y = (canvas.height + canvas.height / spr.camDist * 3) / 2 - img.height * spr.scale;
        
        let fog = 1 - between(nearFog, farFog, spr.camDist);
        
        if ( !bLogSpr && spritesToRender.length > 0 )
        {
            console.log(spr.type, x, y);
            bLogSpr = true;
        }
        
        if ( fog > 0 )
        {
            ctx.globalAlpha = fog;
            
            ctx.drawImage(img, x, y, img.width * spr.scale, img.height * spr.scale);
            ctx.globalAlpha = 1;
        }
    }
}

module.exports = {
    raycast: raycast,
    addTexture: addTexture
};
