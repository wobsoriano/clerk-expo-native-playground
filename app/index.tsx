import { useAuth, useClerk } from '@clerk/expo'
import { AuthView, UserButton, UserProfileView } from '@clerk/expo/native'
import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

import { EventLog } from '../components/EventLog'
import { logEvent } from '../lib/testLog'

type AuthModal = 'none' | 'default' | 'required'

export default function MainScreen() {
  const { isSignedIn, isLoaded, userId, sessionId } = useAuth({ treatPendingAsSignedOut: false })
  const { signOut } = useClerk()

  const [authModal, setAuthModal] = useState<AuthModal>('none')
  const [fullscreenAuth, setFullscreenAuth] = useState(false)
  const [profileModal, setProfileModal] = useState(false)
  const [plainModal, setPlainModal] = useState(false)

  // --- instrumentation: log every auth-state transition with timing ---
  const prevLoaded = useRef(false)
  const prevSignedIn = useRef<boolean | undefined>(undefined)
  const pendingAction = useRef<{ label: string; at: number } | null>(null)

  useEffect(() => {
    if (isLoaded && !prevLoaded.current) {
      prevLoaded.current = true
      logEvent(`isLoaded=true (cold start). isSignedIn=${isSignedIn}`)
    }
  }, [isLoaded, isSignedIn])

  useEffect(() => {
    if (!isLoaded) return
    const prev = prevSignedIn.current
    if (prev === undefined) {
      prevSignedIn.current = !!isSignedIn
      return
    }
    if (prev !== isSignedIn) {
      prevSignedIn.current = !!isSignedIn
      const action = pendingAction.current
      if (action) {
        const elapsed = Date.now() - action.at
        logEvent(`isSignedIn -> ${isSignedIn}  (+${elapsed}ms after "${action.label}")`)
        pendingAction.current = null
      } else {
        logEvent(`isSignedIn -> ${isSignedIn}  (no JS action pending -> native/external)`)
      }
    }
  }, [isSignedIn, isLoaded])

  const onJsSignOut = () => {
    pendingAction.current = { label: 'JS signOut()', at: Date.now() }
    logEvent('▶ JS signOut() called')
    void signOut()
  }

  if (!isLoaded) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.dim}>waiting for isLoaded...</Text>
      </View>
    )
  }

  // Fullscreen required auth (no dismiss possible)
  if (fullscreenAuth && !isSignedIn) {
    return (
      <View style={styles.flex}>
        <AuthView
          mode="signInOrUp"
          isDismissible={false}
          onDismiss={() => {
            logEvent('AuthView(fullscreen) onDismiss fired')
            setFullscreenAuth(false)
          }}
        />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollBody}>
        <Text style={styles.title}>{isSignedIn ? 'Signed in' : 'Signed out'}</Text>
        <Text style={styles.mono}>userId: {userId ?? '-'}</Text>
        <Text style={styles.mono}>sessionId: {sessionId ?? '-'}</Text>

        <Text style={styles.groupLabel}>Isolation test (no Clerk view)</Text>
        <Btn
          label="Open PLAIN modal (same pageSheet)"
          hint="close it: if app still freezes, it's the RN Modal, not Clerk"
          onPress={() => {
            logEvent('open PLAIN modal (no clerk view)')
            setPlainModal(true)
          }}
        />

        {!isSignedIn ? (
          <View style={styles.group}>
            <Text style={styles.groupLabel}>AuthView tests</Text>

            <Btn
              label="1. AuthView in Modal (default props)"
              hint="expect an X / dismiss button (default isDismissible=true)"
              onPress={() => {
                logEvent('open AuthView modal (default props)')
                setAuthModal('default')
              }}
            />
            <Btn
              label="2. AuthView in Modal (isDismissible={false})"
              hint="expect NO dismiss button"
              onPress={() => {
                logEvent('open AuthView modal (isDismissible=false)')
                setAuthModal('required')
              }}
            />
            <Btn
              label="3. AuthView fullscreen (required)"
              hint="root/required auth, cannot dismiss"
              onPress={() => {
                logEvent('show AuthView fullscreen (required)')
                setFullscreenAuth(true)
              }}
            />
          </View>
        ) : (
          <View style={styles.group}>
            <Text style={styles.groupLabel}>Signed-in tests</Text>

            <View style={styles.row}>
              <Text style={styles.rowLabel}>Native UserButton -&gt;</Text>
              <View style={styles.userButtonBox}>
                <UserButton />
              </View>
            </View>
            <Text style={styles.hint}>tap it: native profile should open</Text>

            <Btn
              label="Open UserProfileView in Modal"
              hint="sign out from inside it to test native -> JS sync"
              onPress={() => {
                logEvent('open UserProfileView modal')
                setProfileModal(true)
              }}
            />
            <Btn
              label="Sign out (JS) — measures lag"
              danger
              hint="logs ms from press to isSignedIn=false"
              onPress={onJsSignOut}
            />
          </View>
        )}

        <View style={styles.logBox}>
          <EventLog />
        </View>
      </ScrollView>

      {/* AuthView modals */}
      <Modal
        visible={authModal !== 'none'}
        presentationStyle="pageSheet"
        animationType="slide"
        onRequestClose={() => setAuthModal('none')}
      >
        <View style={styles.flex}>
          <AuthView
            mode="signInOrUp"
            isDismissible={authModal === 'default'}
            onDismiss={() => {
              logEvent(`AuthView(modal:${authModal}) onDismiss fired -> closing modal`)
              setAuthModal('none')
            }}
          />
        </View>
      </Modal>

      {/* Plain isolation modal: no Clerk native view, same presentation as the others */}
      <Modal
        visible={plainModal}
        presentationStyle="pageSheet"
        animationType="slide"
        onRequestClose={() => setPlainModal(false)}
      >
        <View style={[styles.flex, styles.centered]}>
          <Text style={{ fontSize: 18, marginBottom: 20 }}>Plain modal (no Clerk view)</Text>
          <TouchableOpacity
            style={styles.btn}
            onPress={() => {
              logEvent('PLAIN modal close pressed')
              setPlainModal(false)
            }}
          >
            <Text style={styles.btnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* UserProfileView modal */}
      <Modal
        visible={profileModal}
        presentationStyle="pageSheet"
        animationType="slide"
        onRequestClose={() => setProfileModal(false)}
      >
        <View style={styles.flex}>
          <UserProfileView
            onDismiss={() => {
              logEvent('UserProfileView onDismiss fired -> closing modal')
              setProfileModal(false)
            }}
          />
        </View>
      </Modal>
    </View>
  )
}

function Btn({
  label,
  hint,
  onPress,
  danger,
}: {
  label: string
  hint?: string
  onPress: () => void
  danger?: boolean
}) {
  return (
    <TouchableOpacity style={[styles.btn, danger && styles.btnDanger]} onPress={onPress}>
      <Text style={styles.btnText}>{label}</Text>
      {hint ? <Text style={styles.btnHint}>{hint}</Text> : null}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', gap: 12 },
  dim: { color: '#888', fontSize: 13 },
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 60 },
  scrollBody: { padding: 16, gap: 10, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: 'bold' },
  mono: { fontSize: 12, color: '#555', fontFamily: 'Courier' },
  group: { gap: 8, marginTop: 8 },
  groupLabel: { fontSize: 13, fontWeight: '700', color: '#333', marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowLabel: { fontSize: 15, fontWeight: '600' },
  userButtonBox: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: '#ddd' },
  hint: { fontSize: 12, color: '#888' },
  btn: { backgroundColor: '#007AFF', padding: 14, borderRadius: 10 },
  btnDanger: { backgroundColor: '#c0392b' },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  btnHint: { color: '#e8f0ff', fontSize: 11, marginTop: 3 },
  logBox: { height: 260, marginTop: 16 },
})
