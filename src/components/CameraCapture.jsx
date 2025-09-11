import { useEffect, useRef, useState } from 'react';
import { Modal, Button, Alert, Dropdown } from 'react-bootstrap';

/**
 * CameraCapture
 * Props:
 *  - label: string (título del botón/modal)
 *  - facing: 'environment' | 'user' (por defecto environment)
 *  - aspect: number (relación ancho/alto deseada; ej. 1.6 para carnet, 1 para selfie)
 *  - overlay: 'carnet' | 'selfie' | 'credencial' (guías visuales)
 *  - onCapture: (file: File, previewUrl: string) => void
 *  - allowFileFallback?: boolean (default true) -> permite subir archivo en vez de cámara
 */
export default function CameraCapture({
  label,
  facing = 'environment',
  aspect = 1.6,
  overlay = 'carnet',
  onCapture,
  allowFileFallback = true,
}) {
  const [open, setOpen] = useState(false);
  const [devices, setDevices] = useState([]);
  const [activeDeviceId, setActiveDeviceId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    return () => stopStream(); // limpiar al desmontar
  }, []);

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  const listDevices = async () => {
    try {
      const devs = await navigator.mediaDevices.enumerateDevices();
      const cams = devs.filter(d => d.kind === 'videoinput');
      setDevices(cams);
      if (!activeDeviceId && cams.length) {
        setActiveDeviceId(cams[0].deviceId);
      }
    } catch (e) {
      // silencioso
    }
  };

  const start = async (deviceId = null) => {
    setErr(null);
    setLoading(true);
    try {
      stopStream();
      const constraints = deviceId
        ? { video: { deviceId: { exact: deviceId } } }
        : { video: { facingMode: facing } };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      await listDevices();
    } catch (e) {
      setErr('No se pudo acceder a la cámara: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const openModal = async () => {
    setOpen(true);
    await start(activeDeviceId); // inicia con el device actual (o facing)
  };

  const switchTo = async (deviceId) => {
    setActiveDeviceId(deviceId);
    await start(deviceId);
  };

  const dataUrlToFile = async (dataUrl, filename) => {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return new File([blob], filename, { type: 'image/jpeg' });
  };

  // Recorta al centro para respetar aspect ratio y escala a máx 1600px de ancho
  const capture = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) { setErr('La cámara no está lista aún.'); return; }

    // calcular recorte centrado con aspect deseado
    const desired = aspect > 0 ? aspect : vw / vh;
    let cropW = vw;
    let cropH = Math.round(vw / desired);
    if (cropH > vh) {
      cropH = vh;
      cropW = Math.round(vh * desired);
    }
    const sx = Math.floor((vw - cropW) / 2);
    const sy = Math.floor((vh - cropH) / 2);

    // tamaño de salida (limitar ancho máx)
    const maxW = 1600;
    const outW = Math.min(maxW, cropW);
    const outH = Math.round(outW / desired);

    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, sx, sy, cropW, cropH, 0, 0, outW, outH);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    const fname = `${overlay}-${Date.now()}.jpg`;
    const file = await dataUrlToFile(dataUrl, fname);
    onCapture?.(file, dataUrl);
    setOpen(false);
    stopStream();
  };

  const onFileFallback = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    onCapture?.(f, url);
  };

  return (
    <div className="mb-2">
      <div className="d-flex gap-2">
        <Button variant="outline-success" onClick={openModal}>
          Abrir cámara — {label}
        </Button>

        {allowFileFallback && (
          <div>
            <input id={`file-${overlay}`} type="file" accept="image/*" className="d-none" onChange={onFileFallback}/>
            <label htmlFor={`file-${overlay}`} className="btn btn-outline-secondary m-0">
              Subir archivo
            </label>
          </div>
        )}
      </div>

      <Modal show={open} onHide={()=>{ setOpen(false); stopStream(); }} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Capturar: {label}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {err && <Alert variant="danger" className="mb-2">{err}</Alert>}

          <div className="d-flex justify-content-between align-items-center mb-2">
            <small className="text-muted">
              Consejo: encuadra el documento dentro del marco para mejor legibilidad.
            </small>

            {devices.length > 1 && (
              <Dropdown>
                <Dropdown.Toggle size="sm" variant="outline-secondary">Cambiar cámara</Dropdown.Toggle>
                <Dropdown.Menu>
                  {devices.map(d => (
                    <Dropdown.Item key={d.deviceId} active={d.deviceId===activeDeviceId} onClick={()=>switchTo(d.deviceId)}>
                      {d.label || `Cámara ${d.deviceId.slice(0,6)}…`}
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            )}
          </div>

          <div className={`cam-wrap ${overlay}`}>
            <video ref={videoRef} className="cam-video" playsInline muted/>
            <div className={`cam-overlay ${overlay}`}>
              <div className="frame"></div>
              <div className="tips">
                {overlay === 'selfie' ? 'Mira a la cámara con buena luz.' : 'Mantén el carnet recto y sin reflejos.'}
              </div>
            </div>
          </div>

          <canvas ref={canvasRef} className="d-none" />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={()=>{ setOpen(false); stopStream(); }}>Cancelar</Button>
          <Button variant="success" disabled={loading} onClick={capture}>
            {loading ? 'Capturando…' : 'Capturar'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
