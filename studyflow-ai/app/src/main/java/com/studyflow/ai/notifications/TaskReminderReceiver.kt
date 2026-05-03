package com.studyflow.ai.notifications

import android.Manifest
import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.studyflow.ai.R

class TaskReminderReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            val allowed = ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
            if (!allowed) return
        }

        val title = intent.getStringExtra(EXTRA_TASK_TITLE) ?: "Study task"
        val id = intent.getLongExtra(EXTRA_TASK_ID, System.currentTimeMillis()).toInt()
        val notification = NotificationCompat.Builder(context, NotificationScheduler.CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_launcher)
            .setContentTitle("Deadline reminder")
            .setContentText(title)
            .setStyle(NotificationCompat.BigTextStyle().bigText("Time to work on: $title"))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .build()

        context.getSystemService(NotificationManager::class.java).notify(id, notification)
    }

    companion object {
        const val EXTRA_TASK_TITLE = "task_title"
        const val EXTRA_TASK_ID = "task_id"
    }
}
