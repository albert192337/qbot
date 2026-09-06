import type {
  HatchProgress,
  HatchStatus,
  QBotApi,
} from '../../shared/ipc-types';
import { errorMessage } from './model';
export interface NurseryState {
  id: string | null;
  status: HatchStatus | null;
  loading: boolean;
  busy: boolean;
  error: string | null;
}
/** Scene navigation cannot start/resume jobs. Newer pushes invalidate older snapshot reads. */
export class NurseryController {
  state: NurseryState = {
    id: null,
    status: null,
    loading: false,
    busy: false,
    error: null,
  };
  private revision = 0;
  private disposed = false;
  constructor(
    private api: Pick<QBotApi['hatch'], 'getStatus'>,
    private changed: (state: NurseryState) => void,
  ) {}
  private publish(patch: Partial<NurseryState>): void {
    if (this.disposed) return;
    this.state = { ...this.state, ...patch };
    this.changed(this.state);
  }
  async open(id: string | null): Promise<void> {
    ++this.revision;
    this.publish({ id, status: null, loading: !!id, error: null });
    if (id) await this.refresh();
  }
  async refresh(): Promise<void> {
    const id = this.state.id;
    if (!id || this.disposed) return;
    const revision = ++this.revision;
    try {
      const status = await this.api.getStatus(id);
      if (revision !== this.revision || this.disposed) return;
      this.publish({
        status,
        loading: false,
        error: status
          ? null
          : '这份孵化记录已不在了。可以到手记里查看其他朋友。',
      });
    } catch (e) {
      if (revision === this.revision)
        this.publish({ loading: false, error: errorMessage(e) });
    }
  }
  receive(id: string, status?: HatchStatus): void {
    if (id !== this.state.id || this.disposed) return;
    if (status) {
      ++this.revision;
      this.publish({ status, loading: false, error: null });
    } else void this.refresh();
  }
  receiveProgress(event: HatchProgress): void {
    if (event.dirId !== this.state.id || this.disposed) return;
    // Local pipeline failures are emitted before active cleanup and are not always persisted.
    if (event.stage === 'failed') {
      this.receive(event.dirId, {
        ...this.state.status,
        actions: this.state.status?.actions ?? ({} as HatchStatus['actions']),
        stage: 'failed',
        running: false,
        error: event.error ?? '生成暂时中断，进度已经保留。',
      });
    } else this.receive(event.dirId);
  }
  /** Guards double click / two scene controls issuing the same paid operation. */
  async perform(operation: () => Promise<void>): Promise<boolean> {
    if (this.state.busy || this.disposed) return false;
    this.publish({ busy: true, error: null });
    try {
      await operation();
      return true;
    } catch (e) {
      this.publish({ error: errorMessage(e) });
      return false;
    } finally {
      this.publish({ busy: false });
    }
  }
  dispose(): void {
    this.disposed = true;
    ++this.revision;
  }
}
