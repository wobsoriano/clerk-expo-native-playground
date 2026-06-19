import { useAuth, useClerk, useSignIn } from '@clerk/expo'
import { AuthView, UserButton, UserProfileView } from '@clerk/expo/native'
import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'

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
  const [jsSignInModal, setJsSignInModal] = useState(false)

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
              label="0. JS sign-in with email/password"
              hint="JS-owned sign-in; native UserButton should hydrate after success"
              onPress={() => {
                logEvent('open JS sign-in modal')
                setJsSignInModal(true)
              }}
            />
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

      <JsSignInModal
        visible={jsSignInModal}
        onClose={() => setJsSignInModal(false)}
        onPendingAction={action => {
          pendingAction.current = action
        }}
      />

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

function JsSignInModal({
  visible,
  onClose,
  onPendingAction,
}: {
  visible: boolean
  onClose: () => void
  onPendingAction: (action: { label: string; at: number }) => void
}) {
  const { isLoaded, isSignedIn } = useAuth({ treatPendingAsSignedOut: false })
  const { signIn, fetchStatus, errors } = useSignIn()
  const [emailAddress, setEmailAddress] = useState('rob+clerk_test@example.com')
  const [password, setPassword] = useState('@Thecanary01')
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (visible && isLoaded && isSignedIn) {
      onClose()
    }
  }, [isLoaded, isSignedIn, onClose, visible])

  const onSubmit = async () => {
    if (!signIn) {
      return
    }

    setFormError(null)
    onPendingAction({ label: 'JS signIn.password()', at: Date.now() })
    logEvent('▶ JS signIn.password() called')

    try {
      const result = await signIn.password({
        emailAddress,
        password,
      })

      if (result.error) {
        setFormError(result.error.message)
        logEvent(`JS sign-in failed: ${result.error.message}`)
        return
      }

      if (signIn.status === 'complete') {
        logEvent('JS sign-in complete -> finalize()')
        await signIn.finalize()
        onClose()
        return
      }

      const status = signIn.status ?? 'unknown'
      setFormError(`Sign-in status: ${status}`)
      logEvent(`JS sign-in not complete: ${status}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setFormError(message)
      logEvent(`JS sign-in threw: ${message}`)
    }
  }

  const isSubmitting = fetchStatus === 'fetching'
  const canSubmit = Boolean(emailAddress && password && !isSubmitting)

  return (
    <Modal
      visible={visible}
      presentationStyle="pageSheet"
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.jsSignInContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>JS sign-in</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.modalClose}>Close</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.hint}>Use an email/password account. After success, confirm the native UserButton appears.</Text>

        <Text style={styles.inputLabel}>Email address</Text>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          onChangeText={setEmailAddress}
          placeholder="person@example.com"
          style={styles.input}
          value={emailAddress}
        />
        {errors.fields.identifier ? <Text style={styles.errorText}>{errors.fields.identifier.message}</Text> : null}

        <Text style={styles.inputLabel}>Password</Text>
        <TextInput
          autoCapitalize="none"
          onChangeText={setPassword}
          placeholder="Password"
          secureTextEntry
          style={styles.input}
          value={password}
        />
        {errors.fields.password ? <Text style={styles.errorText}>{errors.fields.password.message}</Text> : null}
        {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

        <Btn
          label={isSubmitting ? 'Signing in...' : 'Sign in with JS'}
          hint="calls useSignIn().password()"
          onPress={onSubmit}
          disabled={!canSubmit}
        />
      </View>
    </Modal>
  )
}

function Btn({
  label,
  hint,
  onPress,
  danger,
  disabled,
}: {
  label: string
  hint?: string
  onPress: () => void
  danger?: boolean
  disabled?: boolean
}) {
  return (
    <TouchableOpacity
      style={[styles.btn, danger && styles.btnDanger, disabled && styles.btnDisabled]}
      onPress={onPress}
      disabled={disabled}
    >
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
  btnDisabled: { opacity: 0.45 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  btnHint: { color: '#e8f0ff', fontSize: 11, marginTop: 3 },
  logBox: { height: 260, marginTop: 16 },
  jsSignInContainer: { flex: 1, backgroundColor: '#fff', gap: 10, padding: 20, paddingTop: 64 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  modalTitle: { fontSize: 24, fontWeight: '700' },
  modalClose: { color: '#007AFF', fontSize: 15, fontWeight: '600' },
  inputLabel: { color: '#333', fontSize: 13, fontWeight: '700', marginTop: 8 },
  input: {
    backgroundColor: '#fff',
    borderColor: '#ccc',
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
    padding: 12,
  },
  errorText: { color: '#c0392b', fontSize: 12 },
})
