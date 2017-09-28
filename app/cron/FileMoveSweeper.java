package cron;

import java.util.Date;
import java.util.List;
import java.util.Map;

import models.DatastoreUtil;
import models.FileMove;

import org.joda.time.DateTime;

import play.Logger;

import com.google.appengine.api.datastore.DatastoreService;
import com.google.appengine.api.datastore.DatastoreServiceFactory;
import com.google.appengine.api.datastore.Entity;
import com.google.appengine.api.datastore.FetchOptions;
import com.google.appengine.api.datastore.Key;
import com.google.appengine.api.datastore.PreparedQuery;
import com.google.appengine.api.datastore.Query;
import com.google.appengine.api.datastore.Query.FilterOperator;
import com.google.common.collect.Iterables;

/**
 * Deletes all file moves that are older than {@link FileMove#RETENTION_DAYS}.
 */
public class FileMoveSweeper implements Job {

    private static final int CHUNK_SIZE = 100;
    
    public static void deleteOldFileMoves() {
        Date oldestPermitted = DateTime.now().minusDays(FileMove.RETENTION_DAYS).toDate();
        Query query = FileMove.all()
                              .setFilter(DatastoreUtil.pred("when", FilterOperator.LESS_THAN, oldestPermitted));
        int i = 0;
        for (List<Key> chunk: Iterables.partition(
                DatastoreUtil.queryKeys(query, FetchOptions.Builder.withChunkSize(CHUNK_SIZE).limit(CHUNK_SIZE * 10), FileMove.MAPPER),
                CHUNK_SIZE)) {
            Logger.info("%02d Deleting %s file moves", i, chunk.size());
            DatastoreServiceFactory.getDatastoreService().delete(chunk);
            i++;
            if (i < 10) {
                return;
            }
        }
    }

    @Override
    public void execute(Map<String, String> jobData) {
        Date oldestPermitted = DateTime.now().minusDays(FileMove.RETENTION_DAYS).toDate();
        int numChunks = 1;
        while (true) {
            // TODO: check if query object can be reused
            Query query = FileMove.all()
                .addFilter("when", FilterOperator.LESS_THAN, oldestPermitted)
                .setKeysOnly();

            DatastoreService ds = DatastoreServiceFactory.getDatastoreService();
            PreparedQuery pq = ds.prepare(query);
            List<Entity> entities = pq.asList(FetchOptions.Builder.withChunkSize(CHUNK_SIZE));
            if (entities.isEmpty()) {
                break;
            }

            ds.delete(DatastoreUtil.extractKeys(entities));
            numChunks++;
        }

        Logger.info("Finished sweeping stale file moves. Retention days: %d Chunk size: %d Num chunks: %d",
                FileMove.RETENTION_DAYS, CHUNK_SIZE, numChunks);
    }

}
