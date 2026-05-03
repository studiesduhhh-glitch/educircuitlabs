package com.studyflow.ai.ai

import com.studyflow.ai.data.Priority
import com.studyflow.ai.data.TaskEntity
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit
import kotlin.math.max

object AiPlanner {
    fun studyPlan(tasks: List<TaskEntity>): List<String> {
        val active = tasks.filterNot { it.completed }
            .sortedWith(compareBy<TaskEntity> { it.deadlineMillis ?: Long.MAX_VALUE }
                .thenByDescending { it.priorityEnum.weight })

        if (active.isEmpty()) {
            return listOf(
                "No urgent work is pending. Use today for review and spaced repetition.",
                "Create one small task for tomorrow so your streak stays alive."
            )
        }

        return active.take(5).mapIndexed { index, task ->
            val deadline = task.deadlineMillis?.let { formatRelative(it) } ?: "no fixed deadline"
            val block = when (task.priorityEnum) {
                Priority.High -> "60 focused minutes"
                Priority.Medium -> "35 focused minutes"
                Priority.Low -> "20 light minutes"
            }
            "${index + 1}. ${task.title}: schedule $block, deadline $deadline."
        }
    }

    fun breakIntoSteps(taskTitle: String): List<String> {
        val cleanTitle = taskTitle.ifBlank { "the task" }
        return listOf(
            "Define the exact outcome for $cleanTitle.",
            "Collect notes, examples, and formulas needed.",
            "Work for one focused 25-minute sprint.",
            "Check mistakes and write a tiny summary.",
            "Mark it complete or create the next follow-up task."
        )
    }

    fun reply(prompt: String, tasks: List<TaskEntity>, notesCount: Int): String {
        val lower = prompt.lowercase()
        val active = tasks.filterNot { it.completed }
        val urgent = active.minByOrNull { it.deadlineMillis ?: Long.MAX_VALUE }

        return when {
            "plan" in lower || "schedule" in lower -> studyPlan(tasks).joinToString("\n")
            "break" in lower || "steps" in lower -> breakIntoSteps(urgent?.title ?: prompt).joinToString("\n")
            "priority" in lower -> {
                val high = active.count { it.priorityEnum == Priority.High }
                "You have $high high-priority task(s). Start with ${urgent?.title ?: "the closest deadline"}, then do one medium task before adding anything new."
            }
            "note" in lower -> "You have $notesCount saved note(s). Tag each note by subject so revision stays searchable."
            "streak" in lower || "motivate" in lower -> "Keep the streak tiny: finish one task, write one note, and review for ten minutes. Momentum beats drama."
            else -> {
                val next = urgent?.title ?: "your next study block"
                "Start with $next. I would split it into a short setup, one focused sprint, and a five-minute review."
            }
        }
    }

    private fun formatRelative(deadlineMillis: Long): String {
        val now = Instant.now()
        val deadline = Instant.ofEpochMilli(deadlineMillis)
        val days = ChronoUnit.DAYS.between(now, deadline)
        val date = DateTimeFormatter.ofPattern("MMM d")
            .withZone(ZoneId.systemDefault())
            .format(deadline)
        return when {
            days < 0 -> "overdue ($date)"
            days == 0L -> "today"
            days == 1L -> "tomorrow"
            else -> "in ${max(1, days)} days ($date)"
        }
    }
}
