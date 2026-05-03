package com.studyflow.ai.data

import kotlinx.coroutines.flow.Flow

class StudyRepository(
    private val taskDao: TaskDao,
    private val noteDao: NoteDao
) {
    val tasks: Flow<List<TaskEntity>> = taskDao.observeTasks()
    val notes: Flow<List<NoteEntity>> = noteDao.observeNotes()

    suspend fun saveTask(task: TaskEntity): Long {
        return if (task.id == 0L) taskDao.insert(task) else {
            taskDao.update(task)
            task.id
        }
    }

    suspend fun toggleTask(task: TaskEntity): TaskEntity {
        val updated = task.copy(
            completed = !task.completed,
            completedAt = if (!task.completed) System.currentTimeMillis() else null
        )
        taskDao.update(updated)
        return updated
    }

    suspend fun deleteTask(task: TaskEntity) = taskDao.delete(task)

    suspend fun saveNote(note: NoteEntity): Long {
        return if (note.id == 0L) noteDao.insert(note) else {
            noteDao.update(note.copy(updatedAt = System.currentTimeMillis()))
            note.id
        }
    }

    suspend fun deleteNote(note: NoteEntity) = noteDao.delete(note)
}
