package com.studyflow.ai.notifications

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import com.studyflow.ai.data.TaskEntity

class NotificationScheduler(private val context: Context) {
    fun ensureChannel() {
        val channel = NotificationChannel(
            CHANNEL_ID,
            "Study reminders",
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = "Deadline reminders for StudyFlow tasks"
        }
        context.getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }

    fun schedule(task: TaskEntity) {
        val deadline = task.deadlineMillis ?: return
        if (deadline <= System.currentTimeMillis() || task.completed) return

        val intent = Intent(context, TaskReminderReceiver::class.java).apply {
            putExtra(TaskReminderReceiver.EXTRA_TASK_TITLE, task.title)
            putExtra(TaskReminderReceiver.EXTRA_TASK_ID, task.id)
        }
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            task.id.toInt(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val alarmManager = context.getSystemService(AlarmManager::class.java)
        alarmManager.set(AlarmManager.RTC_WAKEUP, deadline, pendingIntent)
    }

    fun cancel(taskId: Long) {
        val intent = Intent(context, TaskReminderReceiver::class.java)
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            taskId.toInt(),
            intent,
            PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE
        )
        if (pendingIntent != null) {
            context.getSystemService(AlarmManager::class.java).cancel(pendingIntent)
            pendingIntent.cancel()
        }
    }

    companion object {
        const val CHANNEL_ID = "studyflow_deadlines"
    }
}
