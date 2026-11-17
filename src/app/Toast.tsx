import { useUiStore } from '../store/uiStore';
import Icon, { type IconName } from './Icon';

const ICON: Record<string, IconName> = {
  success: 'check',
  warning: 'alert',
  error: 'alert',
  info: 'info'
};

/** Сообщение о результате действия: плашка поверх рабочей области. Ошибки висят, пока их не закроют. */
export default function Toast() {
  const status = useUiStore(s => s.status);

  if (!status) {
    return null;
  }

  return (
    <div className="toast" data-type={ status.type } role="status" aria-live="polite">
      <span className="toast__icon"><Icon name={ ICON[status.type] ?? 'info' } /></span>
      <span className="toast__text">{ status.message }</span>
      <button
        type="button"
        className="toast__close"
        aria-label="Закрыть сообщение"
        onClick={ () => useUiStore.setState({ status: null }) }
      >
        <Icon name="close" size={ 14 } />
      </button>
    </div>
  );
}
