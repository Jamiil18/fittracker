# System architecture

How the app on the phone connects to Supabase and the few external services it uses. Dotted lines happen once or indirectly: the exercise dataset is turned into a migration at build time, and the SecureStore key only decrypts what AsyncStorage holds.

```mermaid
flowchart LR
  subgraph phone["Android phone: FitTracker app"]
    screens["Screens<br/>Expo Router"]
    features["Feature modules<br/>api, hooks, components"]
    domain["Pure domain functions<br/>1RM, records, volume, pace"]
    query["TanStack Query cache<br/>persisted"]
    stores["Zustand stores<br/>active workout, timers, outbox"]
    asyncStorage[("AsyncStorage<br/>encrypted session, stores, cache")]
    secureStore[("SecureStore<br/>session encryption key")]
    device["Device APIs<br/>location, notifications,<br/>haptics, keep awake"]
  end

  subgraph supabase["Supabase"]
    auth["Auth<br/>JWT, refresh token rotation"]
    rest["Data API<br/>PostgREST"]
    db[("Postgres<br/>Row Level Security")]
    edge["Edge Function<br/>delete-account"]
  end

  tiles["OpenFreeMap<br/>map tiles"]
  dataset["free-exercise-db<br/>public domain dataset"]
  actions["GitHub Actions<br/>daily keep-alive"]

  screens --> features
  features --> domain
  features --> query
  features --> stores
  features --> device
  query --> asyncStorage
  stores --> asyncStorage
  secureStore -. decrypts .-> asyncStorage
  query -- HTTPS --> rest
  stores -- outbox sync --> rest
  features -- HTTPS --> auth
  features -- HTTPS --> edge
  features -- HTTPS --> tiles
  rest --> db
  edge --> db
  dataset -. seed migration .-> db
  actions -- heartbeat --> rest
```
