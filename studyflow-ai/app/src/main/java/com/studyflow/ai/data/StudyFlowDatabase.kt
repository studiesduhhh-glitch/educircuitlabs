package com.studyflow.ai.data

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(
    entities = [TaskEntity::class, NoteEntity::class],
    version = 1,
    exportSchema = false
)
abstract class StudyFlowDatabase : RoomDatabase() {
    abstract fun taskDao(): TaskDao
    abstract fun noteDao(): NoteDao

    companion object {
        fun create(context: Context): StudyFlowDatabase {
            return Room.databaseBuilder(
                context.applicationContext,
                StudyFlowDatabase::class.java,
                "studyflow.db"
            )
                .fallbackToDestructiveMigration(false)
                .build()
        }
    }
}
