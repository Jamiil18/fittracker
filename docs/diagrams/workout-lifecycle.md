# Active workout lifecycle

How a workout in progress survives the app going to the background, being killed, or the phone restarting, and how it reaches the server. The session is stored on the phone after every change, and all timers are calculated from stored timestamps.

```mermaid
stateDiagram-v2
  [*] --> NoSession
  NoSession --> Active: Start from routine or empty

  state Active {
    [*] --> Logging
    Logging --> Resting: Complete set
    Resting --> Logging: Rest ends or skipped
  }

  Active --> Backgrounded: App goes to background
  Backgrounded --> Active: Back to foreground
  Backgrounded --> Killed: App killed or phone restarts
  Active --> Killed: App killed or crash
  Killed --> Restored: Next launch
  Restored --> Active: Active workout screen opens

  Active --> Discarded: Discard workout, confirmed
  Active --> Queued: Finish workout, confirmed if sets are incomplete
  Queued --> Queued: Offline or request failed, retry later
  Queued --> Synced: save_workout succeeds
  Discarded --> [*]
  Synced --> [*]

  note right of Backgrounded
    Session already saved on the phone.
    Rest end scheduled as a local notification.
  end note

  note right of Restored
    Session reloaded from AsyncStorage.
    Timers recalculated from timestamps.
    Rest notification rescheduled if still running.
  end note
```

While a workout is queued, it shows "Not synced yet". The queue is retried when the connection returns and when the app comes to the foreground. Because the workout's ID was created on the phone, a retry after a lost response cannot create a duplicate.
