var loadingOverlay;

function init(layers) {
    var limits = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    outlineLayers = layers.filter(function (x) { return x.type == wG.OUTLINE });
    if (outlineLayers.length)
        layers = layers.filter(function (x) { return x.type != wG.OUTLINE });
    else
        outlineLayers = layers;
    for (var i = 0; i < layers.length; i++) {
        wG.touchLimits(layers[i], limits);
        layers[i].enabled = true;
    }
    var w = limits.maxX - limits.minX, h = limits.maxY - limits.minY;

    var renderer, has3D = true;
    try {
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.sortObjects = false;
    } catch (e) {
        debug('Got WebGL error, falling back to 2D canvas.');
        has3D = false;
        wG.ppmm = 20;
        renderer = new THREE.CanvasRenderer({ antialias: true });
    }

    var scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(100);
    camera.up.set(0, 0, -1);
    scene.add(camera);

    // Ambient light.
    var ambientLight = new THREE.AmbientLight(0xcccccc);
    scene.add(ambientLight);

    // Sun light.
    if (has3D) {
        var sunLight = new THREE.SpotLight(0xcccccc, .3);
        sunLight.position.set(0, 150000, 0);
        scene.add(sunLight);
    }

    // Board.
    var Material = has3D ? THREE.MeshPhongMaterial : THREE.MeshBasicMaterial;
    var bottom = wG.makeBoard(w, h), top = wG.makeBoard(w, h, true);
    var bottomTexture = new THREE.Texture(bottom), topTexture = new THREE.Texture(top);
    wG.clearBoard(bottom), wG.clearBoard(top);
    bottomTexture.needsUpdate = true, topTexture.needsUpdate = true;
    var materials = [
        null,
        null,
        new Material({ shininess: 80, ambient: 0xaaaaaa, specular: 0xcccccc, map: topTexture }),
        new Material({ shininess: 80, ambient: 0xaaaaaa, specular: 0xcccccc, map: bottomTexture }),
        null,
        null
    ];
    if (!has3D)
        materials[2].overdraw = true, materials[3].overdraw = true;
    var board = new THREE.Mesh(new THREE.CubeGeometry(w, 1.54, h, has3D ? 1 : Math.ceil(w / 3), 1, has3D ? 1 : Math.ceil(h / 3), materials, { px: 0, nx: 0, pz: 0, nz: 0 }), new THREE.MeshFaceMaterial());
    board.position.y = -100;

    if (has3D)
        scene.add(board);

    // Add the sides.
    var boardMaterial = new Material({ shininess: 80, ambient: 0x333333, specular: 0xcccccc, color: 0x255005 });
    var boardSides = new THREE.CubeGeometry(w, 1.54, h, 1, 1, 1, undefined, { py: 0, ny: 0 });
    boardSides = new THREE.Mesh(boardSides, boardMaterial);
    board.add(boardSides);

    // Create all the holes.
    var holeMaterial = boardMaterial.clone();
    holeMaterial.side = THREE.BackSide;
    for (var i = 0; i < layers.length; i++)
        if (!layers[i].type)
            for (var j = 0; j < layers[i].cmds.length; j++) {
                var cmd = layers[i].cmds[j];
                if (cmd[0] != ((1 << 2) | 3))
                    continue;
                var r = layers[i].scale * layers[i].shapes[cmd[1]][1] / 2;
                var hole = new THREE.CylinderGeometry(r, r, 1.54, 32, 0, true);
                hole = new THREE.Mesh(hole, holeMaterial);
                hole.position.x = (cmd[2] * layers[i].scale - limits.minX) - w / 2;
                hole.position.z = h / 2 - (cmd[3] * layers[i].scale - limits.minY);
                board.add(hole);
            }
    if (!has3D)
        scene.add(board);

    camera.lookAt(board.position);

    var boardControls = new THREE.ObjectControls(board, renderer.domElement);
    boardControls.camera = camera;
    boardControls.eye = camera.position.clone().subSelf(board.position);

    boardControls.noZoom = true;
    boardControls.zoomSpeed = 0;

    // Create a parent container
    var container = $('<div id="webGerberContainer">').css({
        display: 'flex',
        flexDirection: 'row',
        width: '100%',
        height: '100vh',
        zIndex: 1000
    }).appendTo('#hello');

    // Create a canvas container
    var canvasContainer = $('<div id="canvasContainer">').css({
        flex: '1',
        position: 'relative',
        zIndex: 1000
    }).appendTo(container);

    // Append the renderer to the canvas container
    canvasContainer.append(renderer.domElement);

    // Window resize handler
    $(window).resize(function () {
        var width = canvasContainer.width();
        var height = canvasContainer.height();
        renderer.setSize(width, height);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        boardControls.screen.width = width;
        boardControls.screen.height = height;
        boardControls.radius = (width + height) / 4;
    }).resize();

    // Scrolling wheel handler.
    // $(document).mousewheel(function (event, delta, deltaX, deltaY) {
    //     board.position.y *= 1 - deltaY * .06;
    // });

    // Controls
    var controls = $('<div id="controlsContainer">').css({
        width: '250px',
        overflowY: 'auto',
        padding: '10px',
        backgroundColor: '#f0f0f0',
        zIndex: 1000
    }).appendTo(container);

    var controlsText = $('<span>').text('Hide controls').click(function () {
        controls.toggleClass('open');
        controlsText.text(controls.is('.open') ? 'Hide controls' : 'Show controls');
        container.css('flexDirection', controls.is('.open') ? 'row' : 'row-reverse');
    }).css({
        cursor: 'pointer',
        display: 'block',
        marginBottom: '10px'
    }).appendTo(controls);

    var controlsBox = $('<div>').appendTo(controls);

    // Layer visibility checkboxes.
    controlsBox.append('<br><br>Layers:');
    for (var i = 0; i < layers.length; i++) {
        var checkbox = $('<input type=checkbox checked>');
        $('<div>').append(checkbox.click(function () {
            this[1].enabled = this[0].is(':checked');
            repaint = 0;
        }.bind([checkbox, layers[i]])), wG.layerNames[layers[i].side + '' + layers[i].type]).appendTo(controlsBox);
    }

    var outline, repaint = 0;
    // "Show outline" checkbox.
    controlsBox.append('<br>', $('<input type=checkbox>').click(function () {
        if (outline) {
            outline.enabled = outline.sides.visible = this.checked;
            boardSides.visible = !this.checked;
            repaint = this.checked ? layers.length + 1 : 0;
            if (!this.checked)
                updateArea(w, h);
            else
                updateArea(outline.maxX - outline.minX, outline.maxY - outline.minY);
            return;
        }
        if (!this.checked)
            return;

        outline = wG.findOutline(outlineLayers);
        if (!outline.path.length)
            return outline = undefined, alert('Can\'t find any outline!');
        outline.enabled = true;
        boardSides.visible = false;
        updateArea(outline.maxX - outline.minX, outline.maxY - outline.minY);
        var outlineShape = new THREE.Shape();
        outlineShape.moveTo(outline.path[0][0] - limits.minX - w / 2, h / 2 - (outline.path[0][1] - limits.minY));
        for (var i = 0; i < outline.path.length; i++) {
            var cmd = outline.path[i];
            if (cmd.length > 5) {
                var ox = cmd[5], oy = cmd[6], cx = cmd[0] + ox, cy = cmd[1] + oy;
                outlineShape.arc(ox, -oy, Math.sqrt(ox * ox + oy * oy), Math.atan2(oy, -ox), Math.atan2(-(cmd[3] - cy), cmd[2] - cx), !cmd[7]);
                outlineShape.moveTo(cmd[2] - limits.minX - w / 2, -(cmd[3] - limits.minY - h / 2));
            } else
                outlineShape.lineTo(cmd[2] - limits.minX - w / 2, -(cmd[3] - limits.minY - h / 2));
        }
        outline.sides = outlineShape.extrude({ amount: 1.54, bevelEnabled: false, extrudeMaterial: 0, material: 1 });
        outline.sides.materials = [boardMaterial, new THREE.MeshBasicMaterial({ visible: false })];
        board.add(outline.sides = new THREE.Mesh(outline.sides, new THREE.MeshFaceMaterial()));
        outline.sides.position.y = 1.54 / 2;
        outline.sides.rotation.x = Math.PI / 2;
        repaint = layers.length + 1;
    }), 'Show outline');

    function small(text) {
        return $('<span>').css('font-size', 'small').append(text);
    }

    // Area and Cost.
    var areaBox = $('<span>');
    var dimesionsBox = $('<span>');
    controlsBox.append('<br><br>Area: ', areaBox);
    controlsBox.append('<br><br>Dimensions: ', dimesionsBox);
    function updateArea(dw, dh) {
        var areaMM2 = dw * dh, areaIN2 = areaMM2 / 25.4 / 25.4;
        areaMM2 = Math.round(areaMM2 * 100) / 100;
        areaIN2 = Math.round(areaIN2 * 100) / 100;
        height = Math.round(dh * 100) / 100;
        width = Math.round(dw * 100) / 100;
        areaBox.html('').append(small(areaIN2 + ' in<sup>2</sup> (' + areaMM2 + ' mm<sup>2</sup>)'), ' ');
        dimesionsBox.html('').append(small(width + ' mm x ' + height + ' mm'));
        $('.lengthgerb').val(width);
        $('.widthgerb').val(height);
    }
    updateArea(w, h);

    // "Save current view as image" button
    controlsBox.append('<br><br>', $('<button>').text('Save current view as image').click(function () {
        renderer.render(scene, camera);
        var data = renderer.domElement.toDataURL();
        var w = open();
        w.document.title = 'webGerber';
        w.document.body.innerHTML = 'To save the image, right click and press "Save image as..."<br>';
        w.document.body.appendChild($('<img>').attr('src', data)[0]);
    }));

    // Mouse Controls (explanation of).
    controlsBox.append('<br><br>Mouse Controls:<br>Rotate ', small('- Left mouse button + drag'), '<br>Zoom ', small('- Scroll / Middle mouse button + drag'), '<br>Pan ', small('- Right mouse button + drag'));

    // Sort by type, but after listing them.
    layers.sort(function (a, b) {
        return (a.type || 10) - (b.type || 10);
    });

    // Renders the scene (and repaints all the textures that need repainting.
    function render() {
        requestAnimationFrame(render);
        if (repaint !== null) {
            loadingOverlay.show();
            if (repaint === 0)
                wG.clearBoard(bottom), wG.clearBoard(top), repaint++;
            else {
                // Skip any disabled layers.
                while (repaint <= layers.length && !layers[repaint - 1].enabled)
                    repaint++;

                if (repaint <= layers.length) { // Repaint a layer.
                    if (layers[repaint - 1].side & wG.BOTTOM)
                        wG.renderBoard(bottom, layers[repaint - 1], limits);
                    if (layers[repaint - 1].side & wG.TOP)
                        wG.renderBoard(top, layers[repaint - 1], limits);
                } else if (outline && outline.enabled) { // Repaint the outline.
                    wG.renderOutline(bottom, outline, limits);
                    wG.renderOutline(top, outline, limits);
                }

                // Are we finished repainting?
                if (repaint > layers.length)
                    repaint = null, loadingOverlay.hide(), bottomTexture.needsUpdate = true, topTexture.needsUpdate = true;
                else
                    repaint++;
            }
        }
        boardControls.update();
        camera.position.copy(boardControls.eye.clone().addSelf(board.position));
        renderer.render(scene, camera);
    }
    render();
}

$(document).ready(function() {
    // Listen for changes in the input fields
    $('.size-input').on('input', function() {
        var length = parseFloat($('.lengthgerb').val()) || 0;
        var width = parseFloat($('.widthgerb').val()) || 0;
        updateArea(length, width);
    });
});

$(function () {
    if (location.search.match(/(\?|&)debug/))
        wG.debugLog = $('<strong>').css({ width: '100%', 'text-align': 'center', position: 'absolute', 'z-index': 1000, color: '#111', 'font-family': 'monospace' }).prependTo('body');

    debug('Browser info: ' + navigator.userAgent);
    if (typeof window.FileReader === 'undefined')
        debug('Your browser doesn\'t have file access');

    loadingOverlay = $('.overlay');

    var demoLayers = $('script[type="text/x-gerber"]');
    if (demoLayers.length)
        return void (setTimeout(function () {
            init(demoLayers.map(function () {
                var g = wG.load(this.text);
                var guess = wG.guessLayer(this.id);
                g.side = guess[0], g.type = guess[1];
                g.name = this.id;
                return g;
            }).get());
        }, 0));

    loadingOverlay.hide();

    var main = $('.main');
    var fileInput = $('input[type="file"]');
    var layerSelect = $('<select>');
    for (var i = 0; i < wG.layerTypes.length; i++)
        layerSelect.append($('<option>').val(wG.layerTypes[i]).text(wG.layerNames[wG.layerTypes[i]]));

    fileInput.on('change', function (ev) {
        var step2 = $('<div>').append($('<h1>').html(''));
        var files = ev.target.files;
        if (files.length !== 1 || !files[0].name.endsWith('.zip')) {
            return alert('Please select a single .zip file');
        }

        var zip = new JSZip();
        zip.loadAsync(files[0]).then(function (zip) {
            var filePairs = [];
            zip.forEach(function (relativePath, file) {
                if (file.dir) return;
                var fileSelect = layerSelect.clone(), guess = wG.guessLayer(file.name);
                if (guess)
                    fileSelect.val(guess.join(''));
                // step2.append('<br>', $('<strong>').text(file.name + '  '), fileSelect);
                filePairs.push([file, fileSelect]);
            });

            step2.append('<br>', $('<button>').text('Done').click(function () {
                var layerNum = 0;
                for (var i = 0; i < filePairs.length; i++) {
                    if (!filePairs[i][1].val())
                        continue;
                    layerNum++;
                }
                if (!layerNum)
                    return alert('There has to be at one selected layer!');

                var layers = [];
                for (var i = 0; i < filePairs.length; i++) {
                    var f = filePairs[i], which = f[1].val();
                    if (!which)
                        continue;
                    zip.file(f[0].name).async('string').then(function (content) {
                        var g;
                        try {
                            g = wG.load(content);
                        } catch (e) {
                            loadingOverlay.hide();
                            alert('Error while loading ' + this[0] + ': ' + e);
                            console.log(e.stack);
                            return;
                        }
                        g.type = this[2];
                        g.side = this[1];
                        g.name = this[0];
                        if (layers.push(g) >= layerNum) {
                            main.remove();
                            loadingOverlay.hide();
                            setTimeout(function () {
                                init(layers);
                            }, 0);
                        }
                    }.bind([f[0].name, +which[0], +which[1]]));
                }
                loadingOverlay.show();
            }));
            main.html('').append(step2);
        });
    });
});
