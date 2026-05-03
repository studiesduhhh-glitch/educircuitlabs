package com.studyflow.ai

import android.app.Application
import com.studyflow.ai.notifications.NotificationScheduler

class StudyFlowApplication : Application() {
    val database by lazy { com.studyflow.ai.data.StudyFlowDatabase.create(this) }
    val repository by lazy { com.studyflow.ai.data.StudyRepository(database.taskDao(), database.noteDao()) }
    val sessionManager by lazy { com.studyflow.ai.data.LocalSessionManager(this) }
    val notificationScheduler by lazy { NotificationScheduler(this) }

    override fun onCreate() {
        super.onCreate()
        notificationScheduler.ensureChannel()
    }
}
