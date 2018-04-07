var fs = require('fs');
var geom = require('./geometry.js');
var raycaster = require('./raycaster.js');

var spriteImages = {
    sphere: fs.readFileSync('sphere.b64'),
    bucket: fs.readFileSync('bucket.b64')
};

counter = Object.keys(spriteImages).length;
interval = null;

Number.prototype.clamp = function(min, max)
{
    return Math.min(Math.max(this, min), max);
}

function loadVert(v)
{
    return { x: -v[0], y: v[1], z: (v[2] || null) };
}

function loadWalls(l)
{
    let res = [];
    
    for ( let i = 0; i < l.length; i++ )
        res.push({ begin: loadVert(l[i][0]), offset: geom.point.sub(loadVert(l[i][1]), loadVert(l[i][0])), height: l[i][2] });
    
    return res;
}

function imageLoaded()
{
    counter--;
    
    if ( counter < 1 )
    {
        console.log(spriteImages);
        
        main = function main(map)
        {
            if ( interval != null )
                clearInterval(interval);
            
            var walls = loadWalls(map.walls);
            var sprites = map.sprites;
            
            for ( let i = 0; i < sprites.length; i++ )
            {
                sprites[i].pos = loadVert(sprites[i].pos);
                sprites[i].image = spriteImages[sprites[i].type];
            }

            var camPos = loadVert(map.camera.pos);
            var camAngle = map.camera.angle * Math.PI / 180
            var swipe = map.camera.swipeWidth * Math.PI / 180;
            var camFov = map.camera.fov * Math.PI / 180;
            var mapSprites = map.sprites;

            var curAng = camAngle;
            var angDelta = 0;
            var velocity = { x: 0, y: 0 };
            var fVel = 0;
            var breath = 0;
            var breathDelta = 0;
            
            var i = 0;

            var keys = [];

            var cnv = document.getElementById('rayCanvas');
            var ctx = cnv.getContext('2d');
            
            interval = setInterval(function() {
                raycaster.raycast(cnv, walls, camPos, curAng, camFov, ctx, mapSprites, spriteImages);
                
                if ( checkKey(39) )
                    angDelta -= 0.1;
                
                if ( checkKey(37) )
                    angDelta += 0.1;
                
                if ( checkKey(38) )
                    fVel += 0.7;
                
                if ( checkKey(40) )
                    fVel -= 0.7;
                
                curAng += angDelta;
                
                if ( checkKey(16) )
                {
                    fVel = (fVel * 1.9).clamp(-1.8, 1.8);
                    angDelta = (angDelta * 1.5).clamp(-0.09, 0.09);
                }
                
                else
                {
                    fVel = fVel.clamp(-1, 1);
                    angDelta = angDelta.clamp(-0.05, 0.05);
                }
                
                angDelta *= 0.5;
                fVel *= 0.8;
                
                velocity = geom.point.mul(geom.point.fromAngle(curAng), fVel);
                
                // document.getElementById('camPos').innerHTML = "(" + camPos.x + "," + camPos.y + ")";
                // document.getElementById('camAng').innerHTML = (curAng * 180 / Math.PI) % 360 + " degs";
                
                var collides = false;
                var colliders = [];
                
                if ( Math.abs(fVel) > 0.001 )
                {
                    for ( let i = 0; i < walls.length; i++ )
                        if ( geom.lineSeg.collides(walls[i], camPos, 0.8) && geom.point.dot(velocity, geom.point.sub(geom.lineSeg.closest(walls[i], camPos), camPos)) > 0 )
                        {
                            collides = true;
                            colliders.push(walls[i]);
                            // document.getElementById('colDot').innerHTML = geom.point.dot(velocity, geom.lineSeg.closest(walls[i], camPos));
                        }
                        
                    if ( collides )
                    {
                        if ( colliders.length > 1 || geom.point.dot(geom.point.unit(velocity), geom.point.unit(geom.lineSeg.closest(colliders[0], camPos))) > 0.8 )
                            velocity = { x: 0, y: 0 };
                        
                        else
                        {
                            let slide = geom.point.unit(colliders[0].offset);
                            
                            if ( geom.point.dot(slide, velocity) < 0 )
                                slide = geom.point.inverse(slide);
                            
                            velocity = geom.point.mul(slide, geom.point.len(velocity));
                        }
                        
                        // document.getElementById('slideVel').innerHTML = "(" + velocity.x + "," + velocity.y + ")";
                    }
                    
                    // document.getElementById('camVel').innerHTML = "(" + velocity.x + "," + velocity.y + ")";
                    
                    camPos.x += velocity.x;
                    camPos.y += velocity.y;
                    camPos.z = Math.sin(breath) * 2;
                    breathDelta += geom.point.len(velocity) / 25;
                    breath += breathDelta;
                    breathDelta *= 0.975;
                }
            }, 50);

            function checkKey(c)
            {
                return keys.indexOf(c) != -1;
            }

            keyUp = function keyUp(evt)
            {
                while ( keys.indexOf(evt.keyCode) != -1 )
                    keys.pop(keys.indexOf(evt.keyCode));
            }

            keyDown = function keyDown(evt)
            {
                if ( keys.indexOf(evt.keyCode) == -1 )
                    keys.push(evt.keyCode);
            }

            document.onkeydown = keyDown;
            document.onkeyup = keyUp;
        }

        defmap = JSON.parse(fs.readFileSync("./map.json", "utf-8"));
        main(defmap);
    }
}

function mapList(host, callback)
{
    if ( "" in host.split(':') )
        return;
    
    let conn = new WebSocket('ws://' + host, ['soap', 'xmpp']);
    
    conn.onopen = function() {
        if ( !callback(conn) )
            conn.onmessage = onMapListMessage;
    }
}

download = function download()
{
    let host = document.getElementById('mlhost').value;
    let id = document.getElementById('m_id').value;
    
    if ( host != '' && id != '' )
    {
        mapList(host, function(conn) {
            conn.send("RETRIEVE:" + id);
            
            conn.onmessage = function(msg, isBin) {
                if ( !isBin )
                {
                    msg = msg.data;
                    
                    let res = msg.split(':')[0];
                    
                    if ( res == "ERR" )
                        document.getElementById('mlstatus').innerHTML = '<b style="color: red;">' + msg.slice(msg.indexOf(':') + 1) + '</b>';
                        
                    else
                    {
                        document.getElementById('mlstatus').innerHTML = "SUCCESS";
                        main(JSON.parse(document.getElementById('jsonin').value = msg.slice(msg.indexOf(':') + 1)));
                    }
                }
            }
        
            return true;
        })
    }
}

for ( let i = 0; i < Object.keys(spriteImages).length; i++ )
{
    let k = Object.keys(spriteImages)[i];
    let src = spriteImages[k];
    
    spriteImages[k] = new Image();
    spriteImages[k].onload = imageLoaded;
    spriteImages[k].src = src;
}
