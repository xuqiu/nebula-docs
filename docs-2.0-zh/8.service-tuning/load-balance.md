# Storage 负载均衡

用户可以使用`SUBMIT JOB BALANCE`语句平衡分片和 Raft leader 的分布，或者清空某些 Storage 服务器方便进行维护。详情请参见 [SUBMIT JOB BALANCE](../synchronization-and-migration/2.balance-syntax.md)。

!!! danger

    `SUBMIT JOB BALANCE`命令通过创建和执行一组子任务来迁移数据和均衡分片分布，**禁止**停止集群中的任何机器或改变机器的 IP 地址，直到所有子任务完成，否则后续子任务会失败。

## 均衡分片分布


`SUBMIT JOB BALANCE DATA`语句会开始一个作业，将当前图空间的分片平均分配到所有 Storage 服务器。通过创建和执行一组子任务来迁移数据和均衡分片分布。

!!! note

    - 如果当前图空间已经有失败的均衡分片分布作业，无法开始新的均衡分片分布作业，只能恢复之前失败的作业。如果作业一直执行失败，可以先停止作业，再开始新的均衡分片分布作业。
    - 本文介绍默认不开启 Zone 功能的均衡分片分布及迁移 Storage 节点数据方法。当开启 Zone 功能后，必须添加`IN ZONE`选项均衡分片分布。详情参见[管理 Zone](../4.deployment-and-installation/5.zone.md)。

### 示例

以横向扩容{{nebula.name}}为例，集群中增加新的 Storage 主机后，新主机上没有分片。

1. 执行命令`SHOW HOSTS`检查分片的分布。

    ```ngql
    nebual> SHOW HOSTS;
    +-----------------+------+----------+--------------+-----------------------+------------------------+-------------+
    | Host            | Port | Status   | Leader count | Leader distribution   | Partition distribution | Version     |
    +-----------------+------+----------+--------------+-----------------------+------------------------+-------------+
    | "192.168.8.101" | 9779 | "ONLINE" | 0            | "No valid partition"  | "No valid partition"   | "{{nebula.release}}" |
    | "192.168.8.100" | 9779 | "ONLINE" | 15           | "basketballplayer:15" | "basketballplayer:15"  | "{{nebula.release}}" |
    +-----------------+------+----------+--------------+-----------------------+------------------------+-------------+
    ```

2. 进入图空间`basketballplayer`，然后执行命令`SUBMIT JOB BALANCE DATA`将所有分片均衡分布。

    ```ngql
    nebula> USE basketballplayer;
    nebula> SUBMIT JOB BALANCE DATA;
    +------------+
    | New Job Id |
    +------------+
    | 25         |
    +------------+
    ```

3. 根据返回的任务ID，执行命令`SHOW JOB <job_id>`检查任务状态。

    ```ngql
    nebula> SHOW JOB 25;
    +------------------------+-------------------+------------+----------------------------+----------------------------+-------------+
    | Job Id(spaceId:partId) | Command(src->dst) | Status     | Start Time                 | Stop Time                  | State       |
    +------------------------+-------------------+------------+----------------------------+----------------------------+-------------+
    | 25                     | "DATA_BALANCE"    | "FINISHED" | 2023-01-17T06:24:35.000000 | 2023-01-17T06:24:35.000000 | "SUCCEEDED" |
    | "Total:0"              | "Succeeded:0"     | "Failed:0" | "In Progress:0"            | "Invalid:0"                | ""          |
    +------------------------+-------------------+------------+----------------------------+----------------------------+-------------+
    ```

4. 等待所有子任务完成，负载均衡进程结束，执行命令`SHOW HOSTS`确认分片已经均衡分布。

  !!! Note

        `SUBMIT JOB BALANCE DATA`不会均衡 leader 的分布。均衡 leader 请参见[均衡 leader 分布](#leader)。

  ```ngql
  nebula> SHOW HOSTS;
  +-----------------+------+----------+--------------+----------------------+------------------------+-------------+
  | Host            | Port | Status   | Leader count | Leader distribution  | Partition distribution | Version     |
  +-----------------+------+----------+--------------+----------------------+------------------------+-------------+
  | "192.168.8.101" | 9779 | "ONLINE" | 7            | "basketballplayer:7" | "basketballplayer:7"   | "{{nebula.release}}" |
  | "192.168.8.100" | 9779 | "ONLINE" | 8            | "basketballplayer:8" | "basketballplayer:8"   | "{{nebula.release}}" |
  +-----------------+------+----------+--------------+----------------------+------------------------+-------------+
  ```

如果有子任务失败，请执行`RECOVER JOB <job_id>`。如果重做负载均衡仍然不能解决问题，请联系售后工作人员。

### 停止负载均衡作业

停止负载均衡作业，请执行命令`STOP JOB <job_id>`。

- 如果没有正在执行的负载均衡作业，会返回错误。

- 如果有正在执行的负载均衡作业，会返回`Job stopped`。

!!! note

    `STOP JOB <job_id>`不会停止正在执行的子任务，而是取消所有后续子任务，状态会置为`INVALID`，然后等待正在执行的子任执行完毕根据结果置为`SUCCEEDED`或`FAILED`。用户可以执行命令`SHOW JOB <job_id>`检查停止的作业状态。

### 恢复负载均衡作业

恢复负载均衡作业，请执行命令`RECOVER JOB <job_id>`。

!!! note
  
    - 可以恢复执行失败的作业。
    - 对于停止的作业，{{nebula.name}}会判断该作业的开始时间（start time）之后是否有相同类型的失败作业（failed job）或完成作业（finished job），如果有的话，无法恢复停止的作业。例如当有`stopped job1 -> finished job2 -> stopped job3`时，只能恢复 job3，无法恢复 job1。

### 迁移分片

迁移指定的 Storage 主机中的分片来缩小集群规模，可以使用命令`SUBMIT JOB BALANCE DATA REMOVE <ip:port> [,<ip>:<port> ...]`。

如果移除开启了 Zone 功能的 Storage 节点，请添加`IN ZONE`选项，详情参见[管理 Zone](../4.deployment-and-installation/5.zone.md)。

例如需要迁移`192.168.8.100:9779`中的分片，请执行如下命令：

```ngql
nebula> SUBMIT JOB BALANCE DATA REMOVE 192.168.8.100:9779;
nebula> SHOW HOSTS;
+-----------------+------+----------+--------------+-----------------------+------------------------+----------------------+
| Host            | Port | Status   | Leader count | Leader distribution   | Partition distribution | Version              |
+-----------------+------+----------+--------------+-----------------------+------------------------+----------------------+
| "192.168.8.101" | 9779 | "ONLINE" | 15           | "basketballplayer:15" | "basketballplayer:15"  | "{{nebula.release}}" |
| "192.168.8.100" | 9779 | "ONLINE" | 0            | "No valid partition"  | "No valid partition"   | "{{nebula.release}}" |
+-----------------+------+----------+--------------+-----------------------+------------------------+----------------------+
```

!!! note

    该命令仅迁移分片，不会将 Storage 主机从集群中删除。删除 Storage 主机请参见[管理 Storage 主机](../4.deployment-and-installation/manage-storage-host.md)。



## 均衡 leader 分布

用户可以使用命令`SUBMIT JOB BALANCE LEADER`均衡分布所有图空间中的 Leader 分片副本。

### 示例

```ngql
nebula> SUBMIT JOB BALANCE LEADER;
```

用户可以执行`SHOW HOSTS`检查结果。

```ngql
nebula> SHOW HOSTS;
+------------------+------+----------+--------------+-----------------------------------+------------------------+---------+
| Host             | Port | Status   | Leader count | Leader distribution               | Partition distribution | Version |
+------------------+------+----------+--------------+-----------------------------------+------------------------+---------+
| "192.168.10.100" | 9779 | "ONLINE" | 4            | "basketballplayer:3"              | "basketballplayer:8"   | "{{nebula.release}}" |
| "192.168.10.101" | 9779 | "ONLINE" | 8            | "basketballplayer:3"              | "basketballplayer:8"   | "{{nebula.release}}" |
| "192.168.10.102" | 9779 | "ONLINE" | 3            | "basketballplayer:3"              | "basketballplayer:8"   | "{{nebula.release}}" |
| "192.168.10.103" | 9779 | "ONLINE" | 0            | "basketballplayer:2"              | "basketballplayer:7"   | "{{nebula.release}}" |
| "192.168.10.104" | 9779 | "ONLINE" | 0            | "basketballplayer:2"              | "basketballplayer:7"   | "{{nebula.release}}" |
| "192.168.10.105" | 9779 | "ONLINE" | 0            | "basketballplayer:2"              | "basketballplayer:7"   | "{{nebula.release}}" |
+------------------+------+-----------+----------+--------------+-----------------------------------+------------------------+---------+
```

!!! caution

    在{{nebula.name}} {{ nebula.release }} 中，Leader 分片副本切换期间，Leader 分片副本会被暂时禁止写入直到切换完成。如果在 Leader 分片副本切换期间，有大量的写入请求，将会导致请求错误（Storage Error `E_RPC_FAILURE`），错误处理方法见 [FAQ](../20.appendix/0.FAQ.md#storage_error_e_rpc_failure)。
    
    用户可以在 Storage 配置文件中设置`raft_heartbeat_interval_secs`的值来控制 Leader 副本切换的超时时间。有关配置文件的详细信息，请参见[ Storage 配置文件](../5.configurations-and-logs/1.configurations/4.storage-config.md)。
