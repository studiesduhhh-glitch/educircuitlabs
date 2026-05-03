package com.studyflow.ai.data

import android.content.Context
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

class LocalSessionManager(context: Context) {
    private val prefs = context.getSharedPreferences("studyflow_session", Context.MODE_PRIVATE)
    private val _email = MutableStateFlow(prefs.getString(KEY_EMAIL, null))
    private val _darkMode = MutableStateFlow(prefs.getBoolean(KEY_DARK_MODE, false))

    val email: StateFlow<String?> = _email
    val darkMode: StateFlow<Boolean> = _darkMode

    fun signIn(email: String) {
        prefs.edit().putString(KEY_EMAIL, email).apply()
        _email.value = email
    }

    fun signOut() {
        prefs.edit().remove(KEY_EMAIL).apply()
        _email.value = null
    }

    fun setDarkMode(enabled: Boolean) {
        prefs.edit().putBoolean(KEY_DARK_MODE, enabled).apply()
        _darkMode.value = enabled
    }

    companion object {
        private const val KEY_EMAIL = "email"
        private const val KEY_DARK_MODE = "dark_mode"
    }
}
