var RANGE_THRESHOLD = 0.01;
var RANGE_THRESHOLD_2 = Math.pow(RANGE_THRESHOLD, 2);
var SPH_PMASS = 0.00020543, SPH_INTSTIFF = 1.00, SPH_EXTSTIFF = 10000.0, SPH_EXTDAMP  = 256.0;
var Poly6Kern = 315.0 / ( 64.0 * Math.PI * Math.pow( RANGE_THRESHOLD, 9 ) );
var SpikyKern = -45.0 / ( Math.PI * Math.pow( RANGE_THRESHOLD, 6 ) );
var LapKern   = 45.0 / ( Math.PI * Math.pow( RANGE_THRESHOLD, 6 ) );
var DT        = 0.004;
var RADIUS    = 0.004;
var EPSILON   = 0.00001;
var MIN_X =  0.0, MIN_Y =  0.0, MIN_Z = -10.0;
var MAX_X = 20.0, MAX_Y = 20.0, MAX_Z =  10.0;
var SPH_RESTDENSITY = 600.0;
var SPH_PDIST = Math.pow( SPH_PMASS / SPH_RESTDENSITY, 1/3.0 );
var SPH_SIMSCALE = 0.004, SPH_VISC = 0.2, SPH_LIMIT = 200.0,  SPH_LIMIT_2 =  SPH_LIMIT * SPH_LIMIT;

var Particle = function(){
    this.x   = (vec3.create());
    this.v   = (vec3.create());
    this.d   = 0;
    this.p   = 0;
    this.f   = (vec3.create());
    this.setPos     = function(x,y,z){vec3.set(this.x, x,y,z);return this;}
};

var ParticlesManager = function(){
    this.particles = new Array();

    this.createParticle = function(x,y,z){
        return (new Particle()).setPos(x,y,z);
    }

    this.initParticlesInArrangedMatrix = function(row, col, hei){
        var range_x = (MAX_X - MIN_X);
        var range_y = (MAX_Y - MIN_Y)/2;
        var range_z = (MAX_Z - MIN_Z)/3;
        var offset_x = MIN_X;
        var offset_y = MAX_Y/2;
        var offset_z = MIN_Z;
        for(var x = 0 ; x < row ; ++x){
            for(var y = 0; y < col; ++y){
                for(var z = 0; z < hei; ++z){
                    var tmp_x = range_x*1.0*(x+1)/(row + 1) + offset_x;
                    var tmp_y = range_y*1.0*(y+1)/(col + 1) + offset_y;
                    var tmp_z = range_z*1.0*(z+1)/(hei + 1) + offset_z;
                    this.particles.push(this.createParticle(tmp_x, tmp_y, tmp_z));
                }
            }
        }
        console.log("Created points : " + this.particles.length);
    }

    this.update = function(){
        this.updateDensePressure();
        this.updateForce();
        this.updatePosition();
    }

    this.updateDensePressure = function(){
        for( var i = 0 ,len = this.particles.length ; i < len ; ++i){
            var particle = this.particles[i];
            var sum = 0.0;
            for( var other_i = 0, len = this.particles.length; other_i < len; ++other_i ){
                var other_particle = this.particles[other_i];
                if (particle === other_particle)
                    continue;
                var diff_pos = vec3.create();
                vec3.scale( diff_pos,
                            vec3.subtract( vec3.create(),
                                           particle.x,
                                           other_particle.x ),
                            SPH_SIMSCALE);
                var diff_distance =  vec3.squaredLength(diff_pos);
                if (RANGE_THRESHOLD_2 > diff_distance){
                    var c = RANGE_THRESHOLD_2 - diff_distance;
                    sum += Math.pow(c, 3);
                }
            }
            particle.d = sum * SPH_PMASS * Poly6Kern;
            particle.p = Math.max(( particle.d - SPH_RESTDENSITY ) * SPH_INTSTIFF, 0 );
            particle.d = 1 / particle.d;
        }
    }

    this.updateForce = function(){
        for ( var i = 0, len = this.particles.length; i < len; ++i){
            var particle = this.particles[i];
            var force = (vec3.create());
            for( var other_i = 0, len = this.particles.length; other_i < len; ++other_i){
                var other_particle = this.particles[other_i];
                if ( particle == other_particle )
                    continue;
                var diff_pos = vec3.create();
                vec3.scale( diff_pos,
                            vec3.subtract( vec3.create(),
                                           particle.x,
                                           other_particle.x ),
                            SPH_SIMSCALE);
                var diff_distance = vec3.length(diff_pos);
                if( RANGE_THRESHOLD > diff_distance){
                    var c = RANGE_THRESHOLD - diff_distance;
                    var pterm = -0.5 * c * SpikyKern * (particle.p + other_particle.p) / diff_distance;
                    var vterm = LapKern * SPH_VISC;
                    var fcurr =
                        vec3.add(vec3.create(),
                                 vec3.scale(vec3.create(), diff_pos,pterm)
                                 ,vec3.scale(vec3.create(),
                                             vec3.subtract(vec3.create(),
                                                           other_particle.v,
                                                           particle.v),
                                             vterm));
                    vec3.scale(fcurr, fcurr, c * particle.d * other_particle.d);
                    vec3.add(force, force, fcurr);
                }
            }
            particle.f = force;
        }
    }

    this.updatePosition = function(){
        var thres_pos = [MIN_X, MAX_X, MIN_Y, MAX_Y, MIN_Z, MAX_Z];
        var normals = [vec3.fromValues( 1, 0, 0),
                       vec3.fromValues(-1, 0, 0),
                       vec3.fromValues( 0, 1, 0),
                       vec3.fromValues( 0,-1, 0),
                       vec3.fromValues( 0, 0, 1),
                       vec3.fromValues( 0, 0,-1),
                      ];
        var gravity = vec3.fromValues(0, -9.8, 0);
        for ( var i = 0, len = this.particles.length; i < len; ++i){
            var particle = this.particles[i];
            var accel = vec3.create();
            vec3.scale(accel, particle.f, SPH_PMASS);

            var velocity_2 = vec3.squaredLength(accel);
            if ( velocity_2 > SPH_LIMIT_2 ){
                vec3.scale(accel, accel, SPH_LIMIT/Math.sqrt(velocity_2));
            }

            //check each threshold
            for( var k = 0; k < 6 ; ++k){
                diff = 2.0 * RADIUS - Math.pow(-1, k) * ( particle.x[Math.floor(k/2)] - thres_pos[k] ) * SPH_SIMSCALE;
                if ( diff > EPSILON )
                {
                    var adj = SPH_EXTSTIFF * diff - SPH_EXTDAMP * vec3.dot(normals[k], particle.v);
                    vec3.add(accel, accel, vec3.scale(vec3.create(), normals[k], adj));
                }
            }
            vec3.add(accel, accel, gravity);
            vec3.add(particle.v, particle.v, vec3.scale(vec3.create(), accel, DT) );
            vec3.add(particle.x, particle.x, vec3.scale(vec3.create(), particle.v, DT/SPH_SIMSCALE));
        }
    }

    this.getParticles = function(){
        return this.particles;
    }
};