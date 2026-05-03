package com.studyflow.ai.data

import androidx.room.Entity
import androidx.room.PrimaryKey

enum class Priority(val label: String, val weight: Int) {
    Low("Low", 1),
    Medium("Medium", 2),
    High("High", 3);

    companion object {
        fun from(value: String): Priority = entries.firstOrNull { it.label == value } ?: Medium
    }
}

@Entity(tableName = "tasks")
data class TaskEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val title: String,
    val subject: String = "",
    val description: String = "",
    val priority: String = Priority.Medium.label,
    val deadlineMillis: Long? = null,
    val completed: Boolean = false,
    val createdAt: Long = System.currentTimeMillis(),
    val completedAt: Long? = null
) {
    val priorityEnum: Priority
        get() = Priority.from(priority)
}

@Entity(tableName = "notes")
data class NoteEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val title: String,
    val body: String,
    val tags: String = "",
    val updatedAt: Long = System.currentTimeMillis()
)

data class DailyProductivity(
    val dayStartMillis: Long,
    val completedCount: Int
)
