var GLUtils = function()
{
    this.c = null;
    this.gl = null;
    this.vshader = null;
    this.fshader = null;
    this.program = null;

    this.createCanvas = function(width, height){
        this.c = document.createElement('canvas');
        this.c.id = "canvas";
        this.c.width = width;
        this.c.height = height;
        return this.c
    }

    this.registerCanvas = function(target){
        target.appendChild(this.c);
    }

    this.addMouseMoveEventListener = function( move_func ){
        this.c.addEventListener('mousemove', move_func, true);
    }

    this.initGlContext = function(r, g, b){
        this.gl = this.c.getContext('webgl');
        this.canvasClear(r,g,b);
    }

    this.canvasClear = function(r, g, b){
        this.gl.clearColor(r,g,b,1);
        this.gl.clearDepth(1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT, this.gl.DEPTH_BUFFER_BIT);
    }

    this.createVertexShader = function(shader_src){
        this.vshader = this.createShader(shader_src, this.gl.VERTEX_SHADER);
        return this.vshader;
    }

    this.createFragmentShader = function(shader_src){
        this.fshader = this.createShader(shader_src, this.gl.FRAGMENT_SHADER);
        return this.fshader;
    }

    this.getSourceSynch = function(url) {
        var req = new XMLHttpRequest();
        req.open("GET", url, false);
        req.send(null);
        return (req.status == 200) ? req.responseText : null;
    };

    this.createShader = function(shader_src, shader_type){
        var shader;
        if(!shader_src){
            alert("The Target  Src  is not found : "+shader_src);
            return;
        }

        shader = this.gl.createShader(shader_type);
        this.gl.shaderSource(shader, shader_src);
        this.gl.compileShader(shader);

        if(this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)){
            return shader;
        }else{
            alert("Shader compile fail" + shader_src);
        }
    }

    this.createProgram = function(){
        this.program = this.gl.createProgram();
        this.gl.attachShader(this.program, this.vshader);
        this.gl.attachShader(this.program, this.fshader);
        this.gl.linkProgram(this.program);
        if(this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)){
            this.gl.useProgram(this.program);
            return this.program;
        }else{
            alert(this.gl.getProgramInfoLog(this.program));
        }
    }

    this.draw = function(length){
//        this.gl.drawArrays(this.gl.TRIANGLES, 0, 3);
        this.gl.drawElements(this.gl.TRIANGLES, length, this.gl.UNSIGNED_SHORT, 0);
    }

    this.display = function(){
        this.gl.flush();
    }

    this.createVBO = function(data){
        var vbo = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vbo);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(data), this.gl.STATIC_DRAW);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
        return vbo;
    }

    this.createIBO = function(data){
        var ibo = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, ibo);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Int16Array(data), this.gl.STATIC_DRAW);
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, null);
        return ibo;
    }

    this.registerAttribute = function(loc, width, vbo){
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vbo);
        this.gl.enableVertexAttribArray(loc);
        this.gl.vertexAttribPointer(loc, width, this.gl.FLOAT, false, 0, 0);
    }

    //attributes should be dict
    // {"position": 3, ...}
    this.setAttributes = function(attributes, datas){
        var loc_array = new Array();
        var index = 0;
        for (var attribute_key in attributes){
            var tmp_loc = this.gl.getAttribLocation(this.program, attribute_key);
            loc_array.push(
                {"name":attribute_key,
                 "loc":tmp_loc,
                 "width":attributes[attribute_key],
                 "vbo":this.createVBO(datas[index])
                }
            );

            this.registerAttribute
            (loc_array[index].loc, loc_array[index].width, loc_array[index].vbo);

            index += 1;
        }
        return loc_array;
    }

    this.setIBO = function(index){
        //Register ibo
        var ibo = this.createIBO(index);
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, ibo);
    }

    this.getContext = function(){return this.gl;}
    this.getProgram = function(){return this.program;}

    this.registerUniformM4f = function(variable_name, variable){
        var uniLocation = this.gl.getUniformLocation(this.program, variable_name);
        this.gl.uniformMatrix4fv(uniLocation, false, variable);
    }

    this.registerUniformV3f = function(variable_name, variable){
        var uniLocation = this.gl.getUniformLocation(this.program, variable_name);
        this.gl.uniform3fv(uniLocation, variable);
    }

    this.registerUniformV4f = function(variable_name, variable){
        var uniLocation = this.gl.getUniformLocation(this.program, variable_name);
        this.gl.uniform4fv(uniLocation, variable);
    }

    //this is reffered from http://learningwebgl.com/blog/?p=1253
    this.createSphere = function(radius, latitudeBands, longitudeBands){
        var vertexPositionData = [];
        var colorData = [];
        var normalData = [];
        var textureCoordData = [];
        for (var latNumber = 0; latNumber <= latitudeBands; latNumber++) {
            var theta = latNumber * Math.PI / latitudeBands;
            var sinTheta = Math.sin(theta);
            var cosTheta = Math.cos(theta);

            for (var longNumber = 0; longNumber <= longitudeBands; longNumber++) {
                var phi = longNumber * 2 * Math.PI / longitudeBands;
                var sinPhi = Math.sin(phi);
                var cosPhi = Math.cos(phi);

                var x = cosPhi * sinTheta;
                var y = cosTheta;
                var z = sinPhi * sinTheta;
                var u = 1 - (longNumber / longitudeBands);
                var v = 1 - (latNumber / latitudeBands);

                normalData.push(x);
                normalData.push(y);
                normalData.push(z);
                textureCoordData.push(u);
                textureCoordData.push(v);
                vertexPositionData.push(radius * x);
                vertexPositionData.push(radius * y);
                vertexPositionData.push(radius * z);
                colorData.push((x+1)/2);
                colorData.push((y+1)/2);
                colorData.push((z+1)/2);
                colorData.push(1.0);
            }
        }

        var indexData = [];
        for (var latNumber = 0; latNumber < latitudeBands; latNumber++) {
            for (var longNumber = 0; longNumber < longitudeBands; longNumber++) {
                var first = (latNumber * (longitudeBands + 1)) + longNumber;
                var second = first + longitudeBands + 1;
                indexData.push(first);
                indexData.push(second);
                indexData.push(first + 1);

                indexData.push(second);
                indexData.push(second + 1);
                indexData.push(first + 1);
            }
        }

        return [normalData, textureCoordData, colorData, vertexPositionData, indexData];
    }

    this.createBoard = function(courners, rgbs){
        var vertexPositionData = [];
        var normalData = [];
        var colorData = [];

        var normal = vec3.cross(vec3.create(),
                                vec3.subtract(vec3.create(),courners[0], courners[1]),
                                vec3.subtract(vec3.create(),courners[0], courners[2]));
        for ( var index = 0; index <  courners.length; index++){
            var x = courners[index][0];
            var y = courners[index][1];
            var z = courners[index][2];
            vertexPositionData.push(x);
            vertexPositionData.push(y);
            vertexPositionData.push(z);
            colorData.push(rgbs[index][0]);
            colorData.push(rgbs[index][1]);
            colorData.push(rgbs[index][2]);
            colorData.push(rgbs[index][3]);
            normalData.push(normal[0]);
            normalData.push(normal[1]);
            normalData.push(normal[2]);
        }

        var indexData =
            [0, 1, 2,
             1, 3, 2];

        return [normalData, colorData, vertexPositionData, indexData];
    }
}