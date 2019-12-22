import React, { Component } from 'react';
import * as THREE from 'three';
import * as NEO4J from 'neo4j-driver';
import './App.css';

class App extends Component {
    constructor(props) {
        super(props);
        this.state = {  };
    }

    initNeo4j(){
      var driver = NEO4J.driver(
        'bolt://localhost:7687',
        NEO4J.auth.basic('neo4j', 'pgmopen')
      );
      var session = driver.session({ defaultAccessMode: NEO4J.session.READ });
      // Run a Cypher statement, reading the result in a streaming manner as records arrive:
      session
      .run('MERGE (alice:Person {name : $nameParam}) RETURN alice.name AS name', {
        nameParam: 'Alice'
      })
      .subscribe({
        onKeys: keys => {
          console.log(keys)
        },
        onNext: record => {
          console.log(record.get('name'))

        },
        onCompleted: () => {
          session.close() // returns a Promise
        },
        onError: error => {
          console.log(error)
        }
      })
      debugger;
    }
 
    initThree(){
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
            camera.position.set(400,400,400)
            camera.up.set(0,1,0);
            camera.lookAt(0,0,0);
        }
 
        var scene;
        function initScene() {
            scene = new THREE.Scene();
        }
 
        var light;
        function initLight() {
            light = new THREE.AmbientLight(0xFFFFFF);
            light.position.set(300, 300, 0);
            scene.add(light);
        }
 
        function initObject() {
 
            var geometry = new THREE.SphereGeometry( 10, 32, 32 );
            var material = new THREE.MeshBasicMaterial( {color: 0xffff00} );
            // var geometry = new THREE.CubeGeometry(200, 200, 200);
            // var material = new THREE.MeshLambertMaterial({ color: 0xFF0000 });
            var mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(0, 0, 0);
            scene.add(mesh);
        }        
 
        function threeStart() {
            init();
            initCamera();
            initScene();
            initLight();
            initObject();
            animation();
 
        }
        function animation() {         
            renderer.render(scene, camera);
            requestAnimationFrame(animation);
        }
    }
 
    /**
     * 开始Three
     *
     * @memberof App
     */
    componentDidMount(){
        this.initNeo4j();
        this.initThree();
    }
    render() {
        return (
          <div>
            <div id='cypher-frame'>
              <h1>Cypher Runner for New Remoting</h1>
              <div >
                bolt url:<input type='text' id='bolturl' value='bolt://localhost:7687' />
                user name: <input type='text' id='username' value='neo4j' />
                password: <input type='text' id='password'  value='neo4j' />
                <input id='connectserver' type='button' value='Connect' />
              </div>      
              <table width='100%' border='0' cellspacing='0' cellpadding='0'>
                <tr>
                  <td id='console'>
                    <form>
                      <table>
                        <tr>
                          <td class='td1' rowspan='2'><textarea id='statement'>MATCH (n) RETURN n LIMIT 10</textarea></td>
                          <td class='td2'>
                            <table id='parameters'><tbody>
                              <tr>
                                <td><input type='text' id='key' placeholder='(parameter)'/></td>
                                <td><input type='text' id='value' placeholder='(value)'/></td>
                                <td width='20'><input id='addParameter' type='button' value='+'/></td>
                              </tr>
                            </tbody></table>
                          </td>
                        </tr>
                        <tr>
                          <td class='.td3' > 
                          <input id='runButton' type='button' value='RUN' onfocus='this.blur()' />
                          </td>
                        </tr>
                      </table>
                    </form>
                    <div id='results'></div>
                  </td>
                </tr>
              </table>          
            </div>

            <div id='canvas-frame'>  </div>
          </div>
        );
    }
}
 
export default App;