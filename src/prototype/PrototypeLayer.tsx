import Inspector from './Inspector';
import PrototypeCanvas from './PrototypeCanvas';

import '../styles/prototype.css';

/** Слой «Прототип»: canvas экранов и инспектор справа. */
export default function PrototypeLayer() {
  return (
    <div className="prototype-layer">
      <PrototypeCanvas />
      <Inspector />
    </div>
  );
}
