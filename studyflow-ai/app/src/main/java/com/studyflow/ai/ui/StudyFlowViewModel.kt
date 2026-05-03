package com.studyflow.ai.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.studyflow.ai.StudyFlowApplication
import com.studyflow.ai.ai.AiPlanner
import com.studyflow.ai.data.DailyProductivity
import com.studyflow.ai.data.NoteEntity
import com.studyflow.ai.data.Priority
import com.studyflow.ai.data.TaskEntity
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

enum class AppTab { Dashboard, Tasks, Notes, Assistant, Analytics }

data class ChatMessage(
    val author: String,
    val text: String
)

data class AppUiState(
    val email: String? = null,
    val isDarkMode: Boolean = false,
    val selectedTab: AppTab = AppTab.Dashboard,
    val tasks: List<TaskEntity> = emptyList(),
    val notes: List<NoteEntity> = emptyList(),
    val points: Int = 0,
    val streak: Int = 0,
    val assistantMessages: List<ChatMessage> = listOf(
        ChatMessage("AI", "Tell me your deadline, subject, or task. I will turn it into a focused plan.")
    )
) {
    val isSignedIn: Boolean get() = email != null
    val completedTasks: List<TaskEntity> get() = tasks.filter { it.completed }
    val activeTasks: List<TaskEntity> get() = tasks.filterNot { it.completed }
    val dailyTasks: List<TaskEntity> get() = activeTasks.filter { it.deadlineMillis?.let(::isToday) == true }
    val upcomingDeadlines: List<TaskEntity> get() = activeTasks.filter { it.deadlineMillis != null }.take(5)
    val progress: Float get() = if (tasks.isEmpty()) 0f else completedTasks.size / tasks.size.toFloat()
    val productivity: List<DailyProductivity>
        get() = completedTasks
            .mapNotNull { it.completedAt }
            .groupBy { startOfDay(it) }
            .map { DailyProductivity(it.key, it.value.size) }
            .sortedBy { it.dayStartMillis }
            .takeLast(7)
}

class StudyFlowViewModel(application: Application) : AndroidViewModel(application) {
    private val app = application as StudyFlowApplication
    private val repository = app.repository
    private val sessionManager = app.sessionManager
    private val notificationScheduler = app.notificationScheduler

    private val selectedTab = kotlinx.coroutines.flow.MutableStateFlow(AppTab.Dashboard)
    private val points = kotlinx.coroutines.flow.MutableStateFlow(0)
    private val streak = kotlinx.coroutines.flow.MutableStateFlow(0)
    private val assistantMessages = kotlinx.coroutines.flow.MutableStateFlow(
        listOf(ChatMessage("AI", "Tell me your deadline, subject, or task. I will turn it into a focused plan."))
    )

    val uiState: StateFlow<AppUiState> = combine(
        sessionManager.email,
        sessionManager.darkMode,
        selectedTab,
        repository.tasks,
        repository.notes,
        points,
        streak,
        assistantMessages
    ) { values ->
        @Suppress("UNCHECKED_CAST")
        AppUiState(
            email = values[0] as String?,
            isDarkMode = values[1] as Boolean,
            selectedTab = values[2] as AppTab,
            tasks = values[3] as List<TaskEntity>,
            notes = values[4] as List<NoteEntity>,
            points = values[5] as Int,
            streak = values[6] as Int,
            assistantMessages = values[7] as List<ChatMessage>
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), AppUiState())

    fun selectTab(tab: AppTab) {
        selectedTab.value = tab
    }

    fun signIn(email: String, password: String): Boolean {
        if (!email.contains("@") || password.length < 4) return false
        sessionManager.signIn(email.trim())
        return true
    }

    fun googleSignInMock() {
        sessionManager.signIn("student@studyflow.ai")
    }

    fun signOut() {
        sessionManager.signOut()
    }

    fun setDarkMode(enabled: Boolean) {
        sessionManager.setDarkMode(enabled)
    }

    fun saveTask(
        editingTask: TaskEntity?,
        title: String,
        subject: String,
        description: String,
        priority: Priority,
        deadlineMillis: Long?
    ) {
        if (title.isBlank()) return
        viewModelScope.launch {
            val task = (editingTask ?: TaskEntity(title = title.trim())).copy(
                title = title.trim(),
                subject = subject.trim(),
                description = description.trim(),
                priority = priority.label,
                deadlineMillis = deadlineMillis
            )
            val id = repository.saveTask(task)
            notificationScheduler.schedule(task.copy(id = id))
        }
    }

    fun toggleTask(task: TaskEntity) {
        viewModelScope.launch {
            val updated = repository.toggleTask(task)
            if (updated.completed) {
                notificationScheduler.cancel(updated.id)
                points.value += 10 + updated.priorityEnum.weight * 5
                streak.value = (streak.value + 1).coerceAtMost(365)
            }
        }
    }

    fun deleteTask(task: TaskEntity) {
        viewModelScope.launch {
            notificationScheduler.cancel(task.id)
            repository.deleteTask(task)
        }
    }

    fun saveNote(editingNote: NoteEntity?, title: String, body: String, tags: String) {
        if (title.isBlank() && body.isBlank()) return
        viewModelScope.launch {
            repository.saveNote(
                (editingNote ?: NoteEntity(title = title.ifBlank { "Untitled note" }, body = body)).copy(
                    title = title.ifBlank { "Untitled note" }.trim(),
                    body = body.trim(),
                    tags = tags.trim(),
                    updatedAt = System.currentTimeMillis()
                )
            )
        }
    }

    fun deleteNote(note: NoteEntity) {
        viewModelScope.launch {
            repository.deleteNote(note)
        }
    }

    fun askAssistant(prompt: String) {
        if (prompt.isBlank()) return
        val current = uiState.value
        val reply = AiPlanner.reply(prompt, current.tasks, current.notes.size)
        assistantMessages.value = assistantMessages.value + ChatMessage("You", prompt.trim()) + ChatMessage("AI", reply)
    }

    fun suggestedPlan(): List<String> = AiPlanner.studyPlan(uiState.value.tasks)

    fun breakDown(taskTitle: String): List<String> = AiPlanner.breakIntoSteps(taskTitle)
}

fun parseDeadline(input: String): Long? {
    if (input.isBlank()) return null
    return runCatching {
        LocalDate.parse(input.trim())
            .atTime(9, 0)
            .atZone(ZoneId.systemDefault())
            .toInstant()
            .toEpochMilli()
    }.getOrNull()
}

fun formatDate(millis: Long?): String {
    if (millis == null) return "No deadline"
    val date = Instant.ofEpochMilli(millis).atZone(ZoneId.systemDefault()).toLocalDate()
    return date.toString()
}

private fun isToday(millis: Long): Boolean {
    val date = Instant.ofEpochMilli(millis).atZone(ZoneId.systemDefault()).toLocalDate()
    return date == LocalDate.now()
}

private fun startOfDay(millis: Long): Long {
    return Instant.ofEpochMilli(millis)
        .atZone(ZoneId.systemDefault())
        .toLocalDate()
        .atStartOfDay(ZoneId.systemDefault())
        .toInstant()
        .toEpochMilli()
}
