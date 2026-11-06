import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { backupFileName, createBackup, parseBackup, restoreBackup, type Backup, type BackupSummary } from '../lib/backup'
import { daysBetween, toISODate } from '../lib/dates'
import { formatShortDate } from '../lib/format'
import { saveFile } from '../lib/share'
import { isStoragePersisted } from '../lib/storage'
import { strings } from '../strings'

const t = strings.backup

/** "Today" / "Yesterday" / "3 days ago" / "Never" */
export function formatLastBackup(lastBackupAt: number | undefined, today: string): string {
  if (lastBackupAt === undefined) return t.never
  const days = daysBetween(toISODate(new Date(lastBackupAt)), today)
  if (days <= 0) return t.today
  if (days === 1) return t.yesterday
  return t.daysAgo(days)
}

interface Props {
  today: string
  onClose: () => void
}

export function BackupScreen({ today, onClose }: Props) {
  const info = useLiveQuery(async () => ({
    settings: await db.settings.get('app'),
    sessions: await db.sessions.count(),
  }))
  const [persisted, setPersisted] = useState<boolean | undefined>(undefined)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<{ backup: Backup; summary: BackupSummary } | null>(null)
  const [busy, setBusy] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void isStoragePersisted().then(setPersisted)
  }, [])

  async function save(preferDownload = false) {
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const backup = await createBackup(db)
      const file = new File([JSON.stringify(backup)], backupFileName(today), { type: 'application/json' })
      const result = await saveFile(file, { preferDownload })
      if (result !== 'cancelled') {
        await db.settings.update('app', { lastBackupAt: Date.now() })
        setMessage(t.saved)
      }
    } catch {
      setError(strings.saveFailed)
    } finally {
      setBusy(false)
    }
  }

  async function chooseFile(file: File | undefined) {
    if (!file) return
    setError(null)
    setMessage(null)
    const result = parseBackup(await file.text())
    if (fileInput.current) fileInput.current.value = '' // allow picking the same file again
    if (!result.ok) return setError(result.error)
    setPending({ backup: result.backup, summary: result.summary })
  }

  async function confirmRestore() {
    if (!pending) return
    setBusy(true)
    try {
      await restoreBackup(db, pending.backup)
      setPending(null)
      setMessage(t.restored)
    } catch {
      setError(strings.saveFailed)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="backup-screen">
      <button type="button" className="back-button" onClick={onClose}>
        {strings.back}
      </button>
      <h1 className="page-title day-editor-title">{t.title}</h1>
      <p className="backup-intro">{t.intro}</p>

      <div className="backup-card">
        <dl className="backup-facts">
          <dt>{t.lastBackup}</dt>
          <dd>{info ? formatLastBackup(info.settings?.lastBackupAt, today) : '…'}</dd>
          {persisted !== undefined && (
            <>
              <dt>{t.storage}</dt>
              <dd className={persisted ? '' : 'muted'}>{persisted ? t.persisted : t.notPersisted}</dd>
            </>
          )}
        </dl>
        <button type="button" className="btn btn-primary sheet-wide-button" disabled={busy} onClick={() => void save()}>
          {t.save}
        </button>
        <button type="button" className="btn btn-small backup-download" disabled={busy} onClick={() => void save(true)}>
          {t.downloadInstead}
        </button>
      </div>

      {message && <p className="backup-message">{message}</p>}
      {error && <p className="form-error">{error}</p>}

      <h2 className="section-label">{t.restoreTitle}</h2>
      {pending ? (
        <div className="backup-card restore-confirm">
          <p className="restore-from">{t.backupFrom(formatShortDate(toISODate(new Date(pending.summary.exportedAt))))}</p>
          <p className="muted">
            {t.summary(pending.summary.sessions, pending.summary.sets, pending.summary.exercises, pending.summary.machines)}
          </p>
          <p className="restore-compare">
            {t.onPhone(info?.sessions ?? 0)}
            <br />
            {t.inBackup(pending.summary.sessions)}
          </p>
          <p className="restore-question">{t.confirm}</p>
          <div className="sheet-actions">
            <button type="button" className="btn" onClick={() => setPending(null)}>
              {strings.cancel}
            </button>
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void confirmRestore()}>
              {t.replace}
            </button>
          </div>
        </div>
      ) : (
        <div className="backup-card">
          <p className="muted backup-restore-intro">{t.restoreIntro}</p>
          <button type="button" className="btn sheet-wide-button" onClick={() => fileInput.current?.click()}>
            {t.restore}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => void chooseFile(e.target.files?.[0])}
          />
        </div>
      )}
    </section>
  )
}
