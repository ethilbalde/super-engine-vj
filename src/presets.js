/* ═══════════════════════════════════════════
   FACTORY PRESETS — v4
   Couvre tous les paramètres LIVE / SIM / COLOR de chaque moteur.
   Chargé une fois dans localStorage au premier lancement.
   Reset : localStorage.removeItem('super_engine_factory_v4')

   RÈGLE : tout nouveau moteur ajouté au projet DOIT avoir ses presets ici.
═══════════════════════════════════════════ */
(function(){
  var PKEY='super_engine_presets';
  var FLAG='super_engine_factory_v4';
  if(localStorage.getItem(FLAG))return;

  var existing={};
  try{existing=JSON.parse(localStorage.getItem(PKEY)||'{}');}catch(e){}

  var F={

    /* ══════════════════════════════════════════
       FLUID
    ══════════════════════════════════════════ */
    'FLUID — Nébuleuse':{engine:'fluid',fluid:{
      pen_size:60,push_force:2.0,pointer_mode:'push',
      flow_force:0.04,particle_drag:0.985,viscosity:0.98,
      turbulence:0.6,trail:0.92,opacity:0.55,line_width:1.2,vel_max:6,
      color:'#ff44aa',bg_color:'#030008',color_mode:'ramp',
      gravity_x:0,gravity_y:0,
      pulse_enabled:true,pulse_interval:3.0,pulse_strength:2.5,pulse_type:'explode',pulse_beat_div:1,
      hue_shift_enabled:false,hue_shift:0,hue_speed:30
    }},
    'FLUID — Plasma':{engine:'fluid',fluid:{
      pen_size:80,push_force:3.5,pointer_mode:'vortex',
      flow_force:0.12,particle_drag:0.97,viscosity:0.96,
      turbulence:1.4,trail:0.88,opacity:0.7,line_width:0.8,vel_max:14,
      color:'#00ffff',bg_color:'#000000',color_mode:'velocity',
      gravity_x:0,gravity_y:0,
      pulse_enabled:false,pulse_interval:2.0,pulse_strength:3.0,pulse_type:'explode',pulse_beat_div:1,
      hue_shift_enabled:true,hue_shift:0,hue_speed:20
    }},
    'FLUID — Encre':{engine:'fluid',fluid:{
      pen_size:35,push_force:1.2,pointer_mode:'push',
      flow_force:0.02,particle_drag:0.995,viscosity:0.999,
      turbulence:0.1,trail:0.98,opacity:0.9,line_width:2.5,vel_max:4,
      color:'#ffffff',bg_color:'#000000',color_mode:'solid',
      gravity_x:0,gravity_y:0.05,
      pulse_enabled:false,pulse_interval:3.0,pulse_strength:1.5,pulse_type:'ring',pulse_beat_div:2,
      hue_shift_enabled:false,hue_shift:0,hue_speed:30
    }},

    /* ══════════════════════════════════════════
       VORTEX
    ══════════════════════════════════════════ */
    'VORTEX — Galactique':{engine:'vortex',vortex:{
      vortex_count:8,vortex_gamma_min:-4,vortex_gamma_max:4,
      vortex_epsilon:15,vortex_drag:0.9999,vortex_boundary:'reflect',
      speck_count:12000,particle_drag:0.97,flow_force:0.1,
      line_width:0.8,opacity:0.9,trail:0.92,vel_max:8,
      color_mode:'gamma',color_pos:'#ffaa00',color_neg:'#4488ff',
      bg_color:'#010005',pen_size:50,push_force:1.0,spawn_gamma:2.0
    }},
    'VORTEX — Chaos':{engine:'vortex',vortex:{
      vortex_count:20,vortex_gamma_min:-6,vortex_gamma_max:6,
      vortex_epsilon:8,vortex_drag:0.999,vortex_boundary:'reflect',
      speck_count:8000,particle_drag:0.95,flow_force:0.15,
      line_width:0.6,opacity:0.8,trail:0.85,vel_max:12,
      color_mode:'ramp',color_pos:'#ff2266',color_neg:'#2266ff',
      bg_color:'#000000',pen_size:40,push_force:2.0,spawn_gamma:3.0
    }},

    /* ══════════════════════════════════════════
       N-BODY
    ══════════════════════════════════════════ */
    'NBODY — Solaire':{engine:'nbody',nbody:{
      body_count:6,mass_min:80,mass_max:400,G:0.4,softening:20,
      body_drag:0.9998,repulsion_enabled:true,repulsion_strength:1.5,
      boundary_mode:'reflect',show_body_trails:true,trail_length:150,
      speck_count:6000,particle_drag:0.97,flow_force:0.1,
      line_width:1.0,opacity:1.0,trail:0.94,vel_max:6,
      color_mode:'mass',color:'#ffdd00',bg_color:'#000000',
      pen_size:60,push_force:1.0
    }},
    'NBODY — Dense':{engine:'nbody',nbody:{
      body_count:12,mass_min:40,mass_max:200,G:0.6,softening:10,
      body_drag:0.9995,repulsion_enabled:true,repulsion_strength:2.0,
      boundary_mode:'wrap',show_body_trails:true,trail_length:80,
      speck_count:10000,particle_drag:0.95,flow_force:0.12,
      line_width:0.7,opacity:0.8,trail:0.9,vel_max:8,
      color_mode:'ramp',color:'#88ffff',bg_color:'#00000a',
      pen_size:50,push_force:1.5
    }},

    /* ══════════════════════════════════════════
       SPH
    ══════════════════════════════════════════ */
    'SPH — Eau':{engine:'sph',sph:{
      particle_count:2000,rest_density:1.0,stiffness:200,viscosity_mu:0.3,
      smoothing_h:25,gravity_x:0,gravity_y:0.15,
      render_mode:'particles',particle_radius:2,
      color_mode:'velocity',color:'#00ccff',bg_color:'#020510',
      opacity:1.0,trail:0.0,vel_max:5,
      pen_size:50,push_force:1.0
    }},
    'SPH — Lave':{engine:'sph',sph:{
      particle_count:1500,rest_density:1.2,stiffness:300,viscosity_mu:1.0,
      smoothing_h:30,gravity_x:0,gravity_y:0.08,
      render_mode:'particles',particle_radius:3,
      color_mode:'velocity',color:'#ff6600',bg_color:'#100200',
      opacity:1.0,trail:0.05,vel_max:4,
      pen_size:60,push_force:1.5
    }},

    /* ══════════════════════════════════════════
       BOIDS
    ══════════════════════════════════════════ */
    'BOIDS — Nuée':{engine:'boids',boids:{
      boid_count:600,perception_radius:80,
      separation_weight:2.0,alignment_weight:1.5,cohesion_weight:1.0,separation_dist:20,
      max_speed:3.5,max_force:0.12,
      render_mode:'trail',boid_size:4,trail_length_boids:10,
      color_mode:'solid',color:'#ffff00',bg_color:'#000000',
      opacity:1.0,trail:0.92,vel_max:4,
      pen_size:80,push_force:1.0,
      pulse_enabled:false,pulse_interval:3.0,pulse_strength:1.5,pulse_type:'explode',pulse_beat_div:1
    }},
    'BOIDS — Banc':{engine:'boids',boids:{
      boid_count:1200,perception_radius:50,
      separation_weight:1.2,alignment_weight:2.5,cohesion_weight:2.0,separation_dist:15,
      max_speed:4.0,max_force:0.15,
      render_mode:'trail',boid_size:3,trail_length_boids:14,
      color_mode:'velocity',color:'#00ffcc',bg_color:'#000510',
      opacity:0.9,trail:0.96,vel_max:5,
      pen_size:70,push_force:1.5,
      pulse_enabled:false,pulse_interval:2.0,pulse_strength:2.0,pulse_type:'explode',pulse_beat_div:1
    }},

    /* ══════════════════════════════════════════
       PHYSARUM
    ══════════════════════════════════════════ */
    'PHYSARUM — Slime':{engine:'physarum',physarum:{
      agent_count:100000,agent_speed:1.8,
      sensor_angle:15,sensor_distance:10,rotation_angle:30,
      deposit_amount:4.0,decay_rate:0.723,diffuse_rate:0.75,
      color_mode:'pheromone',color_low:'#000000',color_high:'#ffffff',bg_color:'#050505',
      opacity:1.0,pointer_mode:'attract',pen_size:60,push_force:1.0,
      pulse_enabled:false,pulse_interval:2.0,pulse_strength:1.0,pulse_type:'ring',pulse_beat_div:1,
      hue_shift_enabled:false,hue_shift:0,hue_speed:30
    }},
    'PHYSARUM — Réseau':{engine:'physarum',physarum:{
      agent_count:80000,agent_speed:1.2,
      sensor_angle:25,sensor_distance:18,rotation_angle:20,
      deposit_amount:3.0,decay_rate:0.75,diffuse_rate:0.7,
      color_mode:'pheromone',color_low:'#000a00',color_high:'#00ff88',bg_color:'#020804',
      opacity:1.0,pointer_mode:'attract',pen_size:60,push_force:1.0,
      pulse_enabled:false,pulse_interval:4.0,pulse_strength:1.0,pulse_type:'ring',pulse_beat_div:1,
      hue_shift_enabled:false,hue_shift:0,hue_speed:30
    }},
    'PHYSARUM — Dendrite':{engine:'physarum',physarum:{
      agent_count:60000,agent_speed:1.0,
      sensor_angle:35,sensor_distance:18,rotation_angle:80,
      deposit_amount:2.5,decay_rate:0.81,diffuse_rate:0.6,
      color_mode:'pheromone',color_low:'#000000',color_high:'#ff88ff',bg_color:'#050005',
      opacity:1.0,pointer_mode:'attract',pen_size:60,push_force:1.0,
      pulse_enabled:false,pulse_interval:4.0,pulse_strength:1.0,pulse_type:'ring',pulse_beat_div:1,
      hue_shift_enabled:true,hue_shift:0,hue_speed:15
    }},

    /* ══════════════════════════════════════════
       LORENZ
    ══════════════════════════════════════════ */
    'LORENZ — Classique':{engine:'lorenz',lorenz:{
      trajectory_count:2000,attractor:'lorenz',
      lorenz_sigma:10,lorenz_rho:28,lorenz_beta:2.667,
      dt:0.005,proj_angle_x:0.5,proj_angle_y:0.3,proj_scale:15,
      auto_rotate:true,rotate_speed_x:0.003,rotate_speed_y:0.005,
      trail_length:50,
      color_mode:'velocity',color:'#ff6600',bg_color:'#010508',
      trail:0.05,opacity:1.0,line_width:0.7,vel_max:3.0
    }},
    'LORENZ — Rössler':{engine:'lorenz',lorenz:{
      trajectory_count:3000,attractor:'rossler',
      rossler_a:0.2,rossler_b:0.2,rossler_c:5.7,
      dt:0.005,proj_angle_x:0.4,proj_angle_y:0.2,proj_scale:12,
      auto_rotate:true,rotate_speed_x:0.002,rotate_speed_y:0.004,
      trail_length:60,
      color_mode:'velocity',color:'#44ffaa',bg_color:'#000000',
      trail:0.04,opacity:1.0,line_width:0.8,vel_max:2.5
    }},
    'LORENZ — Thomas':{engine:'lorenz',lorenz:{
      trajectory_count:4000,attractor:'thomas',
      thomas_b:0.19,
      dt:0.01,proj_angle_x:0.6,proj_angle_y:0.4,proj_scale:20,
      auto_rotate:true,rotate_speed_x:0.004,rotate_speed_y:0.003,
      trail_length:40,
      color_mode:'ramp',color:'#aa44ff',bg_color:'#010005',
      trail:0.06,opacity:0.9,line_width:0.6,vel_max:2.0
    }},

    /* ══════════════════════════════════════════
       REACT
    ══════════════════════════════════════════ */
    'REACT — Corail':{engine:'react',react:{
      feed:0.055,kill:0.062,Du:0.2097,Dv:0.105,
      preset:'coral',color_mode:'v',color_low:'#000000',color_high:'#ff2266',
      opacity:1.0,pointer_mode:'deposit_v',pen_size:30,push_force:1.0,
      steps_per_frame:8,
      pulse_enabled:false,pulse_interval:2.0,pulse_beat_div:1,
      hue_shift_enabled:false,hue_shift:0,hue_speed:30
    }},
    'REACT — Labyrinthes':{engine:'react',react:{
      feed:0.029,kill:0.057,Du:0.2097,Dv:0.105,
      preset:'maze',color_mode:'v',color_low:'#000000',color_high:'#00ffff',
      opacity:1.0,pointer_mode:'deposit_v',pen_size:30,push_force:1.5,
      steps_per_frame:8,
      pulse_enabled:false,pulse_interval:3.0,pulse_beat_div:1,
      hue_shift_enabled:false,hue_shift:0,hue_speed:30
    }},
    'REACT — Pois':{engine:'react',react:{
      feed:0.035,kill:0.065,Du:0.2097,Dv:0.105,
      preset:'spots',color_mode:'v',color_low:'#000000',color_high:'#ffdd00',
      opacity:1.0,pointer_mode:'deposit_v',pen_size:25,push_force:1.0,
      steps_per_frame:8,
      pulse_enabled:false,pulse_interval:2.0,pulse_beat_div:1,
      hue_shift_enabled:false,hue_shift:0,hue_speed:30
    }},

    /* ══════════════════════════════════════════
       ACO
    ══════════════════════════════════════════ */
    'ACO — Fourmis':{engine:'aco',aco:{
      ant_count:3000,nest_count:2,food_count:5,
      ant_speed:1.5,sensor_angle:45,sensor_distance:8,rotation_angle:40,
      deposit_food:8.0,deposit_nest:3.0,
      evaporation:0.97,diffuse_rate:0.3,wander:0.25,
      food_radius:18,nest_radius:22,
      bg_color:'#050505',color_food:'#00ff88',color_nest:'#ff8800',
      pointer_mode:'food',pen_size:30,push_force:1.0
    }},
    'ACO — Ruche':{engine:'aco',aco:{
      ant_count:5000,nest_count:4,food_count:8,
      ant_speed:2.0,sensor_angle:35,sensor_distance:10,rotation_angle:35,
      deposit_food:10.0,deposit_nest:4.0,
      evaporation:0.975,diffuse_rate:0.35,wander:0.2,
      food_radius:16,nest_radius:20,
      bg_color:'#020100',color_food:'#ffdd00',color_nest:'#ff4400',
      pointer_mode:'food',pen_size:25,push_force:1.0
    }},

    /* ══════════════════════════════════════════
       REACTION-DIFFUSION (rdiff — WebGL)
    ══════════════════════════════════════════ */
    'RDIFF — Peau':{engine:'rdiff',rdiff:{
      f:0.055,k:0.062,du:0.4,dv:0.13,dt:0.5,steps:8,
      brush:20,push_force:1.0,brush_mode:'inject',contrast:2.0,
      pulse_enabled:false,pulse_int:2.0
    }},
    'RDIFF — Zèbre':{engine:'rdiff',rdiff:{
      f:0.022,k:0.051,du:0.4,dv:0.13,dt:0.5,steps:8,
      brush:25,push_force:1.5,brush_mode:'inject',contrast:3.0,
      pulse_enabled:false,pulse_int:3.0
    }},
    'RDIFF — Mazes':{engine:'rdiff',rdiff:{
      f:0.037,k:0.06,du:0.4,dv:0.13,dt:0.5,steps:8,
      brush:15,push_force:1.0,brush_mode:'inject',contrast:2.5,
      pulse_enabled:false,pulse_int:4.0
    }},

    /* ══════════════════════════════════════════
       VORONOI
    ══════════════════════════════════════════ */
    'VORONOI — Cellules':{engine:'voronoi',voronoi:{
      seeds:40,speed:0.5,border_rep:60,repulse:40,
      color_mode:'hue',bw:1.5,
      warp:0,warp_freq:2.5,warp_speed:0.3,metric:0,
      pen_size:80,push_force:1.0,
      pulse_enabled:false,pulse_int:3.0
    }},
    'VORONOI — Cristaux':{engine:'voronoi',voronoi:{
      seeds:80,speed:0.2,border_rep:80,repulse:20,
      color_mode:'dark',bw:3.0,
      warp:0.4,warp_freq:3.0,warp_speed:0.2,metric:0,
      pen_size:60,push_force:1.0,
      pulse_enabled:false,pulse_int:4.0
    }},

    /* ══════════════════════════════════════════
       FOLLOW
    ══════════════════════════════════════════ */
    'FOLLOW — Rivières':{engine:'follow',follow:{
      count:350,speed:6,trail_len:12,wave_amp:8,
      focus_x:0.5,focus_y:0.48,
      fade:0.22,attractor_size:60,
      glow_enabled:true,vignette:true,floor_enabled:true,
      color:'#6688ff',bg_color:'#040408',
      pointer_mode:'attract',pen_size:80,push_force:1.0,
      pulse_enabled:false,pulse_interval:2.0,pulse_type:'burst',pulse_strength:1.0,pulse_beat_div:1,
      hue_shift_enabled:false,hue_shift:0,hue_speed:30
    }},
    'FOLLOW — Magnétique':{engine:'follow',follow:{
      count:500,speed:4,trail_len:20,wave_amp:4,
      focus_x:0.5,focus_y:0.5,
      fade:0.18,attractor_size:80,
      glow_enabled:true,vignette:false,floor_enabled:false,
      color:'#ff4488',bg_color:'#020008',
      pointer_mode:'attract',pen_size:90,push_force:1.5,
      pulse_enabled:false,pulse_interval:3.0,pulse_type:'burst',pulse_strength:1.5,pulse_beat_div:1,
      hue_shift_enabled:false,hue_shift:0,hue_speed:30
    }},

    /* ══════════════════════════════════════════
       RIBBON
    ══════════════════════════════════════════ */
    'RIBBON — Soie':{engine:'ribbon',ribbon:{
      count:120,speed:3.0,trail_len:30,width:4.0,connect_dist:80,turb:1.0,
      fade:0.18,pen_size:60,push_force:1.0,
      bg_color:'#000000',color_head:'#ff66aa',color_tail:'#6622aa',color_thread:'#ff44aa',
      pulse_enabled:false,pulse_interval:3.0,pulse_beat_div:1
    }},
    'RIBBON — Tempête':{engine:'ribbon',ribbon:{
      count:200,speed:5.0,trail_len:20,width:2.5,connect_dist:60,turb:2.5,
      fade:0.12,pen_size:50,push_force:2.0,
      bg_color:'#020408',color_head:'#00ffff',color_tail:'#004466',color_thread:'#0088cc',
      pulse_enabled:false,pulse_interval:2.0,pulse_beat_div:1
    }},

    /* ══════════════════════════════════════════
       PHYSIKS
    ══════════════════════════════════════════ */
    'PHYSIKS — Feu':{engine:'physiks',physiks:{
      grid_res:3,water_spread:4,fire_speed:0.3,update_rate:1,
      pen_size:6,wind:0,soot_cap:6,env_intensity:1,
      ambient_temp:20,fire_temp:850,ignite_temp:260,
      heat_diffusion:0.18,cooling:0.02,
      bg_color:'#0a0804',
      color_sand:'#c8a040',color_water:'#2060c0',color_lava:'#ff5500'
    }},
    'PHYSIKS — Vent':{engine:'physiks',physiks:{
      grid_res:3,water_spread:4,fire_speed:0.4,update_rate:1,
      pen_size:8,wind:3,soot_cap:8,env_intensity:1,
      ambient_temp:20,fire_temp:900,ignite_temp:240,
      heat_diffusion:0.2,cooling:0.015,
      bg_color:'#080a04',
      color_sand:'#c8a040',color_water:'#2060c0',color_lava:'#ff5500'
    }},

    /* ══════════════════════════════════════════
       NEURAL
    ══════════════════════════════════════════ */
    'NEURAL — Synapse':{engine:'neural',neural:{
      count:120,density:0.05,threshold:0.5,refractory:90,
      pulse_speed:2.5,fanout:3,pen_size:60,
      bg_color:'#03080f',color_node:'#1a3a6a',color_active:'#44eeff',
      color_edge:'#0a2040',color_pulse:'#ffffff',
      pulse_enabled:false,pulse_interval:4.0,pulse_beat_div:1
    }},
    'NEURAL — Épilepsie':{engine:'neural',neural:{
      count:200,density:0.12,threshold:0.3,refractory:40,
      pulse_speed:4.0,fanout:5,pen_size:50,
      bg_color:'#08020f',color_node:'#3a1a6a',color_active:'#ff44ee',
      color_edge:'#200a40',color_pulse:'#ffffff',
      pulse_enabled:false,pulse_interval:2.0,pulse_beat_div:1
    }},

    /* ══════════════════════════════════════════
       INK
    ══════════════════════════════════════════ */
    'INK — Encre':{engine:'ink',ink:{
      grid_res:22,pen_size:5,pen_force:1.5,noise:0.4,
      bg_color:'#000000',paint_color:'#ff2200',
      pulse_enabled:false,pulse_interval:3.0,pulse_beat_div:1
    }},
    'INK — Aquarelle':{engine:'ink',ink:{
      grid_res:18,pen_size:8,pen_force:0.8,noise:1.2,
      bg_color:'#f8f4e8',paint_color:'#2244aa',
      pulse_enabled:false,pulse_interval:4.0,pulse_beat_div:1
    }},
    'INK — Nuit':{engine:'ink',ink:{
      grid_res:26,pen_size:4,pen_force:2.0,noise:0.2,
      bg_color:'#020510',paint_color:'#00ffcc',
      pulse_enabled:false,pulse_interval:3.0,pulse_beat_div:1
    }},

    /* ══════════════════════════════════════════
       SLOPE
    ══════════════════════════════════════════ */
    'SLOPE — Vagues':{engine:'slope',slope:{
      field:0,auto_cycle:true,cycle_interval:6.0,
      scale:18,speed:1.0,width_min:1,width_max:5,
      pen_size:90,push_force:1.0,fade:0.10,
      bg_color:'#0f0420',
      color1:'#2b0a3d',color2:'#7a1750',color3:'#c92b4f',color4:'#ef6a3c',color5:'#ffd166',
      pulse_enabled:false,pulse_interval:3.0,pulse_beat_div:1
    }},
    'SLOPE — Fumerolles':{engine:'slope',slope:{
      field:3,auto_cycle:false,cycle_interval:8.0,
      scale:28,speed:0.6,width_min:0.5,width_max:3,
      pen_size:80,push_force:1.0,fade:0.06,
      bg_color:'#100800',
      color1:'#200800',color2:'#6b2500',color3:'#c44000',color4:'#ff8800',color5:'#ffeecc',
      pulse_enabled:false,pulse_interval:4.0,pulse_beat_div:1
    }},
    'SLOPE — Aurore':{engine:'slope',slope:{
      field:5,auto_cycle:true,cycle_interval:10.0,
      scale:35,speed:0.4,width_min:1,width_max:4,
      pen_size:100,push_force:1.0,fade:0.08,
      bg_color:'#000810',
      color1:'#001a20',color2:'#004466',color3:'#0088aa',color4:'#44ffcc',color5:'#ffffff',
      pulse_enabled:false,pulse_interval:5.0,pulse_beat_div:1
    }},

    /* ══════════════════════════════════════════
       DUNE
    ══════════════════════════════════════════ */
    'DUNE — Coucher':{engine:'dune',dune:{
      count:3000,seed:200,scale:120,steps:24,speed:1.2,decay:0.010,
      palette:0,evolve_enabled:true,evolve_duration:60,
      size_min:0.2,size_max:1.6,
      pen_size:70,push_force:1.0,bg_color:'#030303',
      pulse_enabled:false,pulse_interval:8.0,pulse_beat_div:1
    }},
    'DUNE — Océan':{engine:'dune',dune:{
      count:4000,seed:42,scale:80,steps:16,speed:0.8,decay:0.008,
      palette:2,evolve_enabled:true,evolve_duration:90,
      size_min:0.3,size_max:2.0,
      pen_size:80,push_force:1.5,bg_color:'#000308',
      pulse_enabled:false,pulse_interval:6.0,pulse_beat_div:1
    }},
    'DUNE — Cendres':{engine:'dune',dune:{
      count:5000,seed:777,scale:200,steps:32,speed:1.5,decay:0.015,
      palette:1,evolve_enabled:false,evolve_duration:60,
      size_min:0.1,size_max:1.2,
      pen_size:60,push_force:1.0,bg_color:'#050505',
      pulse_enabled:false,pulse_interval:10.0,pulse_beat_div:1
    }},

    /* ══════════════════════════════════════════
       CLOTH
    ══════════════════════════════════════════ */
    'CLOTH — Tissu':{engine:'cloth',cloth:{
      grid_count:50,friction:0.99,force_multiplier:0.25,
      knife_range:15,speed_limit:8,gravity_x:0,gravity_y:0.1,
      line_color:'#00aa88',node_color:'#ff4400',bg_color:'#050505',
      line_width:1.0,node_size:2.0,opacity:0.9,trail:0.02,
      knife_enabled:true,knife_color:'#ffff00',
      pulse_enabled:false,pulse_interval:2.0,pulse_beat_div:1,
      hue_shift_enabled:false,hue_shift:0,hue_speed:20
    }},
    'CLOTH — Voile':{engine:'cloth',cloth:{
      grid_count:60,friction:0.995,force_multiplier:0.15,
      knife_range:12,speed_limit:6,gravity_x:0.05,gravity_y:0.05,
      line_color:'#8855ff',node_color:'#cc44ff',bg_color:'#040208',
      line_width:0.8,node_size:1.5,opacity:0.8,trail:0.03,
      knife_enabled:true,knife_color:'#ffffff',
      pulse_enabled:false,pulse_interval:3.0,pulse_beat_div:1,
      hue_shift_enabled:false,hue_shift:0,hue_speed:20
    }},

    /* ══════════════════════════════════════════
       FLUID PAINTING
    ══════════════════════════════════════════ */
    'FPAINT — Default':{engine:'fpaint',fpaint:{
      pen_size:0.35,push_force:3.2,pointer_mode:'repel',
      speed:1.0,rot_speed:0.05,zoom:2.0,
      grain:1.0,brightness:1.25,vignette:0.125,
      boost_r:1.0,boost_g:1.0,boost_b:1.0,
      pulse_enabled:false,pulse_interval:4.0,pulse_beat_div:1
    }},
    'FPAINT — Slow Burn':{engine:'fpaint',fpaint:{
      pen_size:0.5,push_force:2.0,pointer_mode:'attract',
      speed:0.3,rot_speed:0.02,zoom:3.5,
      grain:0.6,brightness:1.5,vignette:0.2,
      boost_r:1.2,boost_g:0.8,boost_b:0.7,
      pulse_enabled:false,pulse_interval:6.0,pulse_beat_div:1
    }},
    'FPAINT — Froid':{engine:'fpaint',fpaint:{
      pen_size:0.25,push_force:4.0,pointer_mode:'attract',
      speed:1.4,rot_speed:0.08,zoom:1.5,
      grain:1.2,brightness:1.1,vignette:0.08,
      boost_r:0.6,boost_g:0.9,boost_b:1.4,
      pulse_enabled:false,pulse_interval:3.0,pulse_beat_div:1
    }},

    /* ══════════════════════════════════════════
       WFC — Wave Function Collapse
    ══════════════════════════════════════════ */
    'WFC — Circuits':{engine:'wfc',wfc:{
      tile_size:24,line_width:2.8,
      bg_color:'#05050f',fg_color:'#00ffcc',
      blank_weight:0.12,use_curves:true,collapse_speed:6,
      pen_size:60,push_force:1.0,
      pulse_enabled:false,pulse_interval:6.0,pulse_beat_div:1
    }},
    'WFC — Blueprint':{engine:'wfc',wfc:{
      tile_size:32,line_width:2.0,
      bg_color:'#010610',fg_color:'#4499ff',
      blank_weight:0.06,use_curves:false,collapse_speed:4,
      pen_size:60,push_force:1.0,
      pulse_enabled:false,pulse_interval:8.0,pulse_beat_div:1
    }},
    'WFC — Dense Neon':{engine:'wfc',wfc:{
      tile_size:12,line_width:1.4,
      bg_color:'#0a0010',fg_color:'#ff44ee',
      blank_weight:0.02,use_curves:true,collapse_speed:20,
      pen_size:60,push_force:1.0,
      pulse_enabled:true,pulse_interval:4.0,pulse_beat_div:2
    }},
    'WFC — Labyrinth':{engine:'wfc',wfc:{
      tile_size:20,line_width:1.8,
      bg_color:'#0c0800',fg_color:'#ffaa00',
      blank_weight:0.04,use_curves:false,collapse_speed:8,
      pen_size:60,push_force:1.0,
      pulse_enabled:false,pulse_interval:6.0,pulse_beat_div:1
    }}

    /* ── SKETCH ── */
    ,'Sketch — Risographie':{engine:'sketch',sketch:{
      forms_per_frame:60,flower_prob:0.001,spread:0.12,
      size_min:0.5,size_max:2.0,grid_refresh:80,grid_visible:true,grid_weight:0.5,
      bg_color:'#e9dbce',palette_index:-1,
      pulse_enabled:false,pulse_interval:8.0,pulse_beat_div:1
    }}
    ,'Sketch — Neon Storm':{engine:'sketch',sketch:{
      forms_per_frame:150,flower_prob:0.003,spread:0.22,
      size_min:1.0,size_max:5.0,grid_refresh:40,grid_visible:true,grid_weight:0.3,
      bg_color:'#0a0010',palette_index:7,
      pulse_enabled:true,pulse_interval:6.0,pulse_beat_div:2
    }}
    ,'Sketch — Pale Bloom':{engine:'sketch',sketch:{
      forms_per_frame:30,flower_prob:0.005,spread:0.08,
      size_min:0.3,size_max:3.0,grid_refresh:200,grid_visible:false,grid_weight:0.5,
      bg_color:'#f2ede8',palette_index:24,
      pulse_enabled:false,pulse_interval:12.0,pulse_beat_div:1
    }}
    ,'Sketch — Dark Scatter':{engine:'sketch',sketch:{
      forms_per_frame:100,flower_prob:0.0,spread:0.35,
      size_min:0.5,size_max:4.0,grid_refresh:60,grid_visible:true,grid_weight:0.8,
      bg_color:'#111111',palette_index:35,
      pulse_enabled:true,pulse_interval:4.0,pulse_beat_div:1
    }}

    /* ── NS FLUID ── */
    ,'NS Fluid — Doux':{engine:'nstokes',nstokes:{
      velocity_scale:11,mouse_force:0.1,grid_n:15,viscosity:0.00025,
      num_particles:8000,point_size:1.5,trail_alpha:0.15,
      bg_color:'#000000',particle_color:'#ffffff',color_mode:0,
      pulse_enabled:false,pulse_interval:8.0,pulse_beat_div:1
    }}
    ,'NS Fluid — Vélocité Color':{engine:'nstokes',nstokes:{
      velocity_scale:18,mouse_force:0.15,grid_n:20,viscosity:0.0001,
      num_particles:12000,point_size:2.0,trail_alpha:0.08,
      bg_color:'#000000',particle_color:'#38bdf8',color_mode:1,
      pulse_enabled:false,pulse_interval:8.0,pulse_beat_div:1
    }}
    ,'NS Fluid — Tempête':{engine:'nstokes',nstokes:{
      velocity_scale:25,mouse_force:0.25,grid_n:25,viscosity:0.00005,
      num_particles:20000,point_size:1.0,trail_alpha:0.05,
      bg_color:'#050510',particle_color:'#ff6644',color_mode:1,
      pulse_enabled:true,pulse_interval:6.0,pulse_beat_div:2
    }}
    ,'NS Fluid — Position Arc-en-ciel':{engine:'nstokes',nstokes:{
      velocity_scale:14,mouse_force:0.12,grid_n:18,viscosity:0.0002,
      num_particles:10000,point_size:2.5,trail_alpha:0.2,
      bg_color:'#0a0a0a',particle_color:'#ffffff',color_mode:2,
      pulse_enabled:false,pulse_interval:10.0,pulse_beat_div:1
    }}

    /* ── Ajouter ici les presets de tout nouveau moteur ── */

  };

  var added=0;
  Object.keys(F).forEach(function(name){
    if(!existing[name]){existing[name]=F[name];added++;}
  });

  localStorage.setItem(PKEY,JSON.stringify(existing));
  localStorage.setItem(FLAG,'1');
  console.log('[presets] '+added+' factory presets chargés');
})();
