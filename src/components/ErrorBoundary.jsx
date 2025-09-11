import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props){
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error){
    return { error };
  }
  componentDidCatch(error, info){
    console.error('ErrorBoundary:', error, info);
  }
  render(){
    if (this.state.error){
      return (
        <div style={{ padding: '1.5rem' }}>
          <h4>Ups, hubo un error en la UI</h4>
          <pre style={{ whiteSpace: 'pre-wrap', background: '#fff3cd', padding: '1rem', border: '1px solid #ffeeba' }}>
            {String(this.state.error?.message || this.state.error)}
          </pre>
          <p className="text-muted">Abre la consola (F12) para más detalles.</p>
        </div>
      );
    }
    return this.props.children;
  }
}
