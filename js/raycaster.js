var geom = require('./geometry.js');

var fogColor = [0.6, 0.6, 0.6];
var wallColor = [0.9, 0.125, 0];
var groundColor = [0.1, 0.175, 0.4];
var ceilColor = [0.7, 0.85, 0.9];
var nearFog = 128;
var farFog = 256;
var darkDist = 192;
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

rowDist = function rowDist(y, height)
{
    return Math.pow(height / ((height + 1) - y), 3);
}

function flatPos(y, height, angle, pos)
{
    return {
        x: pos.x + Math.cos(angle) * rowDist(y, height),
        y: pos.y + Math.sin(angle) * rowDist(y, height)
    };
}

screenDists = [];

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

function raycast(canvas, walls, camPos, camAngle, fov, ctx, sprites, spimes, textures, lights) // :D
{
    var id = ctx.createImageData(1, 1);
    var data = id.data;
    var planeX = Math.cos(camAngle + Math.PI / 2) * Math.tan(fov * canvas.width / canvas.height / 2);
    var planeY = Math.sin(camAngle + Math.PI / 2) * Math.tan(fov * canvas.width / canvas.height / 2);
    
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
        
        ctx.fillStyle = "#" + colorHex(color[0]) + colorHex(color[1]) + colorHex(color[2]);
        ctx.fillRect(0, y, canvas.width, 1);
        
        /*
        for ( let bx = 0; bx < canvas.width; bx++ )
        {
            let fpos = flatPos(y, canvas.height / 2, rayAngle(camAngle, bx, fov * (canvas.width / canvas.height), canvas.width), camPos);
            let bright = 1;
            
            for ( l in lights )
                bright += l.strength / geom.point.sqlen(geom.point.sub(fpos, l.pos));
            
            bright = bright.clamp(0, 3);
            
            if ( bright > 1 )
            {
                ctx.fillStyle = "rgba(1, 1, 1, " + ((bright - 1) / 2).toString() + ")";
                ctx.fillRect(x, startY, 1, wsize);
            }
        }
        */
    }
    
    for (; y < canvas.height; y++ )
    {
        var prog = (canvas.height - y);
        var color = interpolateColor(groundColor, fogColor, between(nearFog, farFog, rowDist(prog, canvas.height / 2)));
        var bright = (darkDist / rowDist(y, prog)).clamp(0, 1);
        
        if ( bright <= 1 )
        {           
            color[0] *= bright;
            color[1] *= bright;
            color[2] *= bright;
        }
        
        ctx.fillStyle = "#" + colorHex(color[0]) + colorHex(color[1]) + colorHex(color[2]);
        ctx.fillRect(0, y, canvas.width, 1);
        
        /*
        for ( let bx = 0; bx < canvas.width; bx++ )
        {
            let fpos = flatPos(prog, canvas.height / 2, rayAngle(camAngle, bx, fov * (canvas.width / canvas.height), canvas.width), camPos);
            let bright = 1;
            
            for ( l in lights )
                bright += l.strength / geom.point.sqlen(geom.point.sub(fpos, l.pos));
            
            bright = bright.clamp(0, 3);
            
            if ( bright > 1 )
            {
                ctx.fillStyle = "rgba(1, 1, 1, " + ((bright - 1) / 2).toString() + ")";
                ctx.fillRect(x, startY, 1, wsize);
            }
        }
        */
    }
    
    var nextProx = null;
    screenDists = [];
    
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
            let fog = 1 - between(nearFog, farFog, realDist) * 1.41;
            screenDists.push(curDist);
            
            if ( fog > 0 )
            {
                let normWSize = Math.round(2 * canvas.height / curDist);
                let wsize = Math.round(curLine.height * canvas.height / curDist);
                let startY = Math.floor(canvas.height / 2 - curLine.height * canvas.height / curDist - camPos.z + 1.5 * canvas.height / curDist);
                
                let proxBright = geom.point.len(geom.point.sub(camPos, curInter)).clamp(0, 2.75) / 2.75;
                let bright = (Math.abs(geom.point.dot(geom.lineSeg.normalTo(curLine, camPos), { x: 1, y: 0 })) * 0.7 + 0.3) * proxBright * (1 - (curDist / darkDist)).clamp(0, 1);
                
                for ( let i = 0; i < lights.length; i++ )
                {
                    //if ( geom.point.len(geom.point.sub(curInter, lights[i].pos)) <= lights[i].radius )
                    //{
                    let rs = lights[i].radius / geom.point.len(geom.point.sub(curInter, lights[i].pos)) * lights[i].strength;
                    
                    if ( rs <= 0 )
                        continue;
                    
                    bright += rs;
                    //}
                }
                    
                bright = bright.clamp(0, 6);
                
                if ( nextProx == null )
                    nextProx = proxBright;
                
                if ( proxBright < nextProx )
                    nextProx = proxBright;
                
                let color = null;
                
                if ( curLine.colType == "flat" || !curLine.colType )
                {
                    if ( curLine.color )
                        color = Array.from(curLine.color);
                    
                    else
                        color = Array.from(wallColor);
                    
                    ctx.globalAlpha = fog * fog;
                    ctx.fillStyle = "#" + colorHex(color[0]) + colorHex(color[1]) + colorHex(color[2]);
                    ctx.fillRect(x, startY, 1, wsize);
                    ctx.globalAlpha = 1;
                }

                else if ( curLine.colType == "textured" && Object.keys(textures).indexOf(curLine.texture) > -1 )
                {
                    let tex = textures[curLine.texture];
                    let wx = Math.round(geom.point.len(geom.point.sub(curInter, curLine.begin)) * canvas.width / tex.width);
                    let tx = wx % tex.width;
                    
                    ctx.globalAlpha = fog * fog;
                    ctx.drawImage(tex, tx, 0, 1, tex.height, x, startY, 1, wsize);
                    ctx.globalAlpha = 1;
                }
                
                if ( bright > 1 )
                    ctx.fillStyle = "#FFFFFF" + colorHex(((bright - 1) / 5) * fog * fog);
                
                else
                    ctx.fillStyle = "#000000" + colorHex((1 - bright) * fog * fog);
                
                ctx.fillRect(x, startY, 1, wsize);
            }
        }
    }
    
    var spritesToRender = [];
    var theta = rayAngle(camAngle, 0, fov, canvas.width);
    
    for ( let i = 0; i < sprites.length; i++ )
    {
        let sprite = sprites[i];
        let offs = geom.point.sub(sprite.pos, camPos);
        
        let invDet = 1.0 / (planeX * Math.sin(camAngle) - Math.cos(camAngle) * planeY);
        
        let transformX = invDet * (Math.sin(camAngle) * offs.x - Math.cos(camAngle) * offs.y);
        let transformY = invDet * (planeX * offs.y - planeY * offs.x);
        let distance = transformY / Math.cos(Math.abs(camAngle - Math.atan2(offs.y, offs.x)));
        
        let screenSprite = Object.assign(sprite, {});
        screenSprite.camDist = transformY;
        screenSprite.distance = distance;
        
        if ( transformY > 0.1 )
        {
            screenSprite.renderX = Math.round((canvas.width / 2) * (1 + transformX / screenSprite.camDist));
          
            //if ( screenDists[screenSprite.renderX] > screenSprite.camDist )
            //{
            // document.getElementById('shadow').innerHTML = screenSprite.renderX + " (" + offs.x + "," + offs.y + " [" + transformX + "])";
        
            if ( sprite.kind != "text" )
                screenSprite.scale = sprite.size * canvas.height / spimes[sprite.type].height / screenSprite.camDist;
            
            else
                screenSprite.scale = sprite.size / screenSprite.camDist;
            
            spritesToRender.push(screenSprite);
            //}
        }
    }
    
    spritesToRender.sort(function (a, b) { return b.distance - a.distance; });
    
    for ( let i = 0; i < spritesToRender.length; i++ )
    {
        let spr = spritesToRender[i];
        
        let x = spr.renderX;
        let y = (canvas.height + canvas.height / spr.camDist * 3) / 2;
        
        if ( spr.kind == "text" && spr.text != "" && screenDists[x] > spr.camDist )
        {
            y = (canvas.height + canvas.height / spr.camDist / 2) / 2;
            
            let txc = document.createElement('canvas');
            
            txc.width = canvas.width;
            txc.height = canvas.height;
            
            let tctx = txc.getContext('2d');
            
            ctx.font = (150 * spr.size / spr.camDist).toString() + "px Arial";
            ctx.fillStyle = "white";
            ctx.lineWidth = 5 / spr.camDist;
            ctx.strokeStyle = "black";
            ctx.textAlign = "center";
            
            ctx.fillText(spr.text, x, y);
            ctx.strokeText(spr.text, x, y);
        }
        
        else if ( spr.kind == "sprite" )
        {
            let img = spimes[spr.type];
            
            x -= img.width * spr.scale / 2;
            y -= img.height * spr.scale;
            
            let fog = ((spr.distance - nearFog) / (farFog - nearFog)).clamp(0, 1); // wtf, func between does not work
            fog = 1 - fog;
            
            /*
            if ( !bLogSpr && spritesToRender.length > 0 )
            {
                console.log(spr.type, x, y);
                bLogSpr = true;
            }
            */
            
            spr.fog = fog;
            ctx.globalAlpha = fog * fog;
            
            if ( fog > 0 )
            {
                
                let wx = 0;
                
                for (; wx < img.width * spr.scale; wx++ )
                    if ( screenDists[Math.round(x + wx)] > spr.camDist )
                        ctx.drawImage(img, wx / spr.scale, 0, 1, img.height, x + wx, y, spr.scale, img.height * spr.scale);
                
                ctx.font = "30px Arial";
            }
            
            ctx.globalAlpha = 1;
        }
    }
}

module.exports = {
    raycast: raycast
};
