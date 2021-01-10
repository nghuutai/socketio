import React from 'react';
import logo from './logo.svg';
import './App.css';
import socketClient  from "socket.io-client";
import { uuid } from 'uuidv4';

let socket = socketClient('http://localhost:8080');

class App extends React.Component {
  constructor(props) {
    super(props);
    
    this.state = {
      task: {},
      id: '',
    }
  }

  componentDidMount() {
    const id = uuid();
    socket.on('connect', () => {
      socket.emit('userConnect', id, socket.id);
    })

    socket.on('assign', (data) => {
      this.setState({
        task: data,
      });
      console.log(data);
    });
  }

  handleChange = (e) => {
    this.setState({
      [e.target.name]: e.target.value,
    });
  }

  // handle task assigned
  handleSubmit = (e) => {
    e.preventDefault();
    const { task } = this.state;
    let result = {};
    if (task.text % 2 === 0) {
      result = {
        status: 'oke',
      }
    } else {
      result = {
        status: 'faile',
        ...task,
        count: task.count ? task.count + 1 : 1,
      }
      console.log('failed');
    }
    socket.emit('handle', {
      id: socket.id,
      status: 'ready'
    }, result);
  }

  render() {
    return (
      <div className="App" style={{ marginTop: '30px' }}>
        <div>
          <textarea rows="5" cols="20" value={this.state.message} />
        </div>
        <div>
          <input name="input" style={{ marginRight:'20px' }} onChange={this.handleChange} />
          <button onClick={this.handleSubmit}>Submit</button>
        </div>
     </div>
    )
  }
}


export default App;
