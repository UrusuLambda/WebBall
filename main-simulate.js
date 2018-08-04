onload = function(){
    var sim = new Simulater();
    sim.setup();
    sim.run();
}

var q = quat.identity(quat.create());

var Simulater = function(){
    this.setup = function(){
        //Setup SPH particles
        var particles_manager = new ParticlesManager();
        particles_manager.initParticlesInArrangedMatrix(15, 15, 5);
        this.particles_manager = particles_manager;

        //Init WebGL Util
        var webgl_util = new GLUtils();

        //Init Canvas and Canvas Context
        webgl_util.createCanvas(800, 400);
        webgl_util.registerCanvas(document.body);
        webgl_util.initGlContext(1, 0, 1);
        this.setupGlParams(webgl_util);

        //Complie shader
        vertex_src = webgl_util.getSourceSynch("http://localhost/gl/shaders/shader.vs");
        webgl_util.createVertexShader(vertex_src);
        fragment_src = webgl_util.getSourceSynch("http://localhost/gl/shaders/shader.fs");
        webgl_util.createFragmentShader(fragment_src);

        //Shader setup
        webgl_util.createProgram();
        this.shaders_custom_setup(webgl_util);
        this.webgl_util = webgl_util;
    }

    this.run = function(){
        this.webgl_util.addMouseMoveEventListener(function(e){
            var c  = document.getElementById("canvas");
            var cw = c.width;
            var ch = c.height;
            var wh = 1 / Math.sqrt(cw * cw + ch * ch);
            var x = e.clientX - c.offsetLeft - cw * 0.5;
            var y = e.clientY - c.offsetTop  - ch * 0.5;
            var sq = Math.sqrt( x * x + y * y);
            var r = sq * 2.0 * Math.PI * wh;
            if(sq != 1){
                sq = 1/ sq;
                x *= sq;
                y *= sq;
            }
            quat.setAxisAngle(q, [y, x, 0], r);
        });
        //main function
        this.loop();
    }

    this.shaders_custom_setup = function(webgl_obj){
        var sphere_vertex_info = webgl_obj.createSphere(0.8, 6, 6);
        var board_vertex_info  = webgl_obj.createBoard(
            [vec3.fromValues(MIN_X,  0, MIN_Z),
             vec3.fromValues(MIN_X,  0, MAX_Z),
             vec3.fromValues(MAX_X,  0, MIN_Z),
             vec3.fromValues(MAX_X,  0, MAX_Z)
            ],
            [[1, 0, 0, 1],
             [0, 1, 0, 1],
             [0, 0, 1, 1],
             [1, 1, 1, 1],]
        );

        var gl = webgl_obj.getContext();
        var program = webgl_obj.getProgram();
        var particles_manager = this.particles_manager;
        var particles = particles_manager.getParticles();
        var attribute_pair = {"position":3, "normal":3, "color":4};

        var orig_mMatrix = mat4.identity(mat4.create());
        var mMatrix = mat4.identity(mat4.create());
        var qMatrix = mat4.identity(mat4.create());
        var vMatrix = mat4.identity(mat4.create());
        var pMatrix = mat4.identity(mat4.create());
        var mvpMatrix = mat4.identity(mat4.create());
        var tmpMatrix = mat4.identity(mat4.create());
        var invMatrix = mat4.identity(mat4.create());

        mat4.lookAt(vMatrix,[-20.0, 30.0, 10.0], [10.0, 10.0, 0.0], [0, 1, 0]);
        mat4.perspective(pMatrix ,45, 800/400, 0.1, 100);
        mat4.multiply( tmpMatrix, pMatrix, vMatrix);

        var lightDirection = [0.5,  0.5, -0.5];
        var eyeDirection   = [   2,  -3,   -1];
        var ambientColor   = [0.1, 0.1, 0.1, 1.0];

        this.loop = function(){
            webgl_obj.canvasClear(0, 0, 0);
            //Display Board
            {
                var attribute_info = webgl_obj.setAttributes(attribute_pair, [board_vertex_info[2], board_vertex_info[0], board_vertex_info[1]]);

                webgl_obj.setIBO(board_vertex_info[3]);

                mat4.identity(mMatrix);
                mat4.multiply( mvpMatrix, tmpMatrix, mMatrix);
                mat4.invert(invMatrix, mMatrix);
                webgl_obj.registerUniformM4f('mvpMatrix', mvpMatrix);
                webgl_obj.registerUniformM4f('invMatrix', invMatrix);
                webgl_obj.registerUniformV3f('lightDirection', lightDirection);
                webgl_obj.registerUniformV3f('eyeDirection', eyeDirection);
                webgl_obj.registerUniformV4f('ambientColor', ambientColor);

                webgl_obj.draw(board_vertex_info[3].length);
            }

            var attribute_info = webgl_obj.setAttributes(attribute_pair, [sphere_vertex_info[3], sphere_vertex_info[0], sphere_vertex_info[2]]);
            webgl_obj.setIBO(sphere_vertex_info[4]);

            //Display ball
            for (var i = 0, len = particles.length; i < len; ++i){
                mat4.identity(mMatrix);
                mat4.fromRotationTranslation(mMatrix, q, particles[i].x);
                mat4.multiply( mvpMatrix, tmpMatrix, mMatrix);
                mat4.invert(invMatrix, mMatrix);

                webgl_obj.registerUniformM4f('mvpMatrix', mvpMatrix);
                webgl_obj.registerUniformM4f('invMatrix', invMatrix);
                webgl_obj.registerUniformV3f('lightDirection', lightDirection);
                webgl_obj.registerUniformV3f('eyeDirection', eyeDirection);
                webgl_obj.registerUniformV4f('ambientColor', ambientColor);

                webgl_obj.draw(sphere_vertex_info[4].length);
            }
            gl.flush();
            particles_manager.update();
            setTimeout(arguments.callee, 1000/20);
        };
    }

    this.setupGlParams = function(webgl_util_obj){
        //Culling enable
        webgl_util_obj.gl.enable(webgl_util_obj.gl.CULL_FACE);
        //Depth Test enable
        webgl_util_obj.gl.enable(webgl_util_obj.gl.DEPTH_TEST);
        webgl_util_obj.gl.depthFunc(webgl_util_obj.gl.LEQUAL);
    }
}