import React, { Component } from 'react';
import * as THREE from 'three';
import * as NEO4J from 'neo4j-driver';
import {FirstPersonControls} from './FirstPersonControls.js';
import './App.css';

const clock = new THREE.Clock();
class App extends Component {
    constructor(props) {
        super(props);
        this.state = { neo4j:{driver:null,bolt:'bolt://localhost:7687',username:'neo4j',password: 'pgmopen',cypher: 'MATCH (n)-[r]-() RETURN n,r LIMIT 50'},
                       webgl:{scene:null},
                       result:{nodes:[],rels:[]}
                      };
    }

    initNeo4j(){
      if(!this.state.neo4j.driver){
      var driver = NEO4J.driver(
        this.state.neo4j.bolt,
        NEO4J.auth.basic(this.state.neo4j.username, this.state.neo4j.password)
      );       
      this.state.neo4j.driver=driver;
      }
    }
    runCypher(){
      if(!this.state.neo4j.driver){
        alert("请先连接Neo4j")
        return false;
      }
      var that=this;
      var session = this.state.neo4j.driver.session({ defaultAccessMode: NEO4J.session.READ });     
      session .run(this.state.neo4j.cypher , {})
      .subscribe({
        onKeys: keys => {
          //console.log(keys)
        }, 
        onNext: record => {     
          record.forEach( function( value ) {  
              if(value.start&&value.end){//关系
                var item={rel:value,mesh:null}
                that.setState({
                  result:{ ...that.state.result,rels : [...that.state.result.rels, item]}
                })
              }else{//节点
                // var hasNode = that.state.result.nodes.find(item=>item.node.identity=value.identity)
                // if(!hasNode){
                  var mesh=that.initMesh() ;
                  var item={node:value,mesh:mesh}
                  that.setState({
                    result:{ ...that.state.result,nodes : [...that.state.result.nodes, item]}
                  })  
                //}              
              }
              console.log(that.state.result)
          });
          
        },
        onCompleted: () => {
          //创建关系在3D中的连线
              that.state.result.rels.forEach( function( rel ) {  
                //找到起始节点
                var startNode=that.state.result.nodes.find(item=>item.node.identity.low==rel.rel.start.low);
                //找到终止节点
                var endNode=that.state.result.nodes.find(item=>item.node.identity.low==rel.rel.end.low);
                //创建3D连线
                if(startNode&&endNode){
                var line=that.initLine(startNode.mesh.position,endNode.mesh.position)
                //保存进state.result.rels

                }

              });
          session.close() // returns a Promise
        },
        onError: error => {
          alert('连接失败，请检查bolt url 或 Neo4j是否启动')
        }
      })
    }
 
    initThree(){
        var that=this;
        threeStart();
 
        var renderer,width,height; 
        function init() {
            width = window.innerWidth;
            height = window.innerHeight;
            renderer = new THREE.WebGLRenderer({
                antialias: true
            });
            renderer.setSize(width, height);
            document.getElementById('canvas-frame').appendChild(renderer.domElement);
            renderer.setClearColor(0x000000, 1.0);
        }
 
        var camera;
        function initCamera() {
            camera = new THREE.PerspectiveCamera(45, width / height, 1, 10000);
            camera.position.set(200,0,200)
            camera.up.set(0,1,0);
            camera.lookAt(0,0,0);
        }
 
        var scene;
        function initScene() {
            scene = new THREE.Scene();
            scene.background = new THREE.Color().setHSL( 0.6, 0, 1 );
            scene.fog = new THREE.Fog( scene.background, 1, 5000 );
            that.state.webgl.scene=scene;
        }
 
        var dirLight,hemiLight;
        function initLight() {
            dirLight = new THREE.DirectionalLight( 0xffffff, 1 );
            dirLight.color.setHSL( 0.1, 1, 0.95 );
            dirLight.position.set( 0, 500, 0 );
            dirLight.position.multiplyScalar( 30 );
            scene.add( dirLight );

            hemiLight = new THREE.HemisphereLight( 0xffffff, 0xffffff, 0.6 );
            hemiLight.color.setHSL( 0.6, 1, 0.6 );
            hemiLight.groundColor.setHSL( 0.095, 1, 0.75 );
            hemiLight.position.set( 0, 100, 0 );
            scene.add( hemiLight );
        }
 
        // function initObject() { 
        //     var geometry = new THREE.SphereGeometry( 5, 32, 32 );
        //     var material = new THREE.MeshPhongMaterial( { color: 0x4080ff, dithering: true } );
        //     var mesh = new THREE.Mesh(geometry, material);
        //     mesh.position.set(0, 0, 0);
        //     scene.add(mesh);


        //     var material = new THREE.LineBasicMaterial( { color: 0x0000ff } );
        //     var geometry = new THREE.Geometry();
        //     geometry.vertices.push(new THREE.Vector3( -10, 0, 0) );
        //     geometry.vertices.push(new THREE.Vector3( 0, 10, 0) );
        //     var line = new THREE.Line( geometry, material );
        //     scene.add( line );
        // }   

        function initEnviorment(){
          // GROUND
          var groundGeo = new THREE.PlaneBufferGeometry( 10000, 10000 );
          var groundMat = new THREE.MeshLambertMaterial( { color: 0xffffff } );
          groundMat.color.setHSL( 0.095, 1, 0.75 );
          var ground = new THREE.Mesh( groundGeo, groundMat );
          ground.position.y = - 100;
          ground.rotation.x = - Math.PI / 2;
          ground.receiveShadow = true;
          scene.add( ground );
        
          // SKYDOME
          var vertexShader = document.getElementById( 'vertexShader' ).textContent;
          var fragmentShader = document.getElementById( 'fragmentShader' ).textContent;
          var uniforms = {
            "topColor": { value: new THREE.Color( 0x0077ff ) },
            "bottomColor": { value: new THREE.Color( 0xffffff ) },
            "offset": { value: 33 },
            "exponent": { value: 0.6 }
          };
          uniforms[ "topColor" ].value.copy( hemiLight.color );
          scene.fog.color.copy( uniforms[ "bottomColor" ].value );
          var skyGeo = new THREE.SphereBufferGeometry( 4000, 32, 15 );
          var skyMat = new THREE.ShaderMaterial( {
            uniforms: uniforms,
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            side: THREE.BackSide
          } );
          var sky = new THREE.Mesh( skyGeo, skyMat );
          scene.add( sky );
        }
        
        /* 控制器 */
        var controls;
        function initControls() {
          /* 第一人称控件 */
          controls = new FirstPersonControls(camera, renderer.domElement);
          controls.movementSpeed = 100;
          controls.lookSpeed = 0.08;
          controls.mouseDragOn =false;
      }
 
        function threeStart() {
            init();
            initCamera();
            initScene();
            initLight();
            initControls();
            //initObject();
            initEnviorment();
            animation();
 
        }
        
        function animation() {         
            renderer.render(scene, camera);
            requestAnimationFrame(animation);
            controls.update(clock.getDelta());
        }
    }
 
    initLine(start,end){
      var material = new THREE.LineBasicMaterial( { color: 0x0000ff } );
      var geometry = new THREE.Geometry();
      geometry.vertices.push(start );
      geometry.vertices.push(end );
      var line = new THREE.Line( geometry, material );
      this.state.webgl.scene.add( line );
      return line;
    }
    initMesh() { 

      var x=Math.ceil(Math.random()*100);
      var y=Math.ceil(Math.random()*100);
      var z=Math.ceil(Math.random()*100);
      var geometry = new THREE.SphereGeometry( 5, 32, 32 );
      var material = new THREE.MeshPhongMaterial( { color: 0x4080ff, dithering: true } );
      var mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      this.state.webgl.scene.add(mesh);
      return mesh;      
  }   

    handleBoltChange(e){
      this.setState({
        neo4j:{...this.state.neo4j,bolt : e.target.value}
      })
    }
    handleUserNameChange(e){
      this.setState({
        neo4j:{...this.state.neo4j, username : e.target.value}
      })
    }
    handlePasswordChange(e){
      this.setState({
        neo4j:{...this.state.neo4j,password : e.target.value}
      })
    }
    handleCypherChange(e){
      this.setState({
        neo4j:{ ...this.state.neo4j,cypher : e.target.value}
      })
    }

    handleConnect(e){      
      this.initNeo4j();
    }
    /**
     * 开始Three
     *
     * @memberof App
     */
    componentDidMount(){
        this.initThree();
    }
    render() {
        return (
          <div>
            <div id='cypher-frame'>              
              <div >
                bolt url:<input type='text'  onChange={this.handleBoltChange.bind(this)} value={this.state.neo4j.bolt} />
                user name: <input type='text'  onChange={this.handleUserNameChange.bind(this)} value={this.state.neo4j.username} />
                password: <input type='text'   onChange={this.handlePasswordChange.bind(this)} value={this.state.neo4j.password} />
                <input  type='button' value='Connect' onClick={this.handleConnect.bind(this)} />
              </div>      
              <table width='100%' border='0' cellSpacing='0' cellPadding='0'><tbody>
                <tr>
                  <td id='console'>
                    <form>
                      <table><tbody>
                        <tr>
                          <td className='td1' rowSpan='2'>
                          <textarea id='statement' onChange={this.handleCypherChange.bind(this)} value={this.state.neo4j.cypher}></textarea>
                          </td>
                        </tr>
                        <tr>
                          <td className='.td3' > 
                          <input id='runButton' type='button' value='RUN'   onClick={this.runCypher.bind(this)}/>
                          </td>
                        </tr>
                        </tbody></table>
                    </form>
                  </td>
                </tr>
                </tbody></table>          
            </div>

            <div id='canvas-frame'>  </div>
          </div>
        );
    }
}
 
export default App;